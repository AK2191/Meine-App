(function(root){
  'use strict';
  if(!root || root.ChangeCalendarOwnerAudit) return;

  var VERSION = '0.1.0330';
  var TARGETS = ['renderCalendar', 'renderMonth', 'setCalView', 'navigate', 'goToday'];
  var state = {
    version: VERSION,
    startedAt: new Date().toISOString(),
    snapshots: []
  };

  function hashText(text){
    var hash = 0;
    text = String(text || '');
    for(var i = 0; i < text.length; i++){
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
  }

  function describeValue(name, value){
    var kind = typeof value;
    var info = {
      name: name,
      kind: kind,
      functionName: '',
      arity: '',
      chars: '',
      hash: '',
      preview: ''
    };
    if(kind === 'function'){
      var text = '';
      try{ text = Function.prototype.toString.call(value); }catch(e){}
      info.functionName = value.name || '(anonymous)';
      info.arity = value.length || 0;
      info.chars = text.length;
      info.hash = hashText(text);
      info.preview = text.replace(/\s+/g, ' ').slice(0, 120);
    }
    return info;
  }

  function readValue(name){
    try{ return root[name]; }catch(e){ return undefined; }
  }

  function hasSameFingerprint(left, right){
    if(!left || !right) return false;
    return left.kind === right.kind &&
      left.functionName === right.functionName &&
      left.arity === right.arity &&
      left.chars === right.chars &&
      left.hash === right.hash;
  }

  function previousRecord(name){
    for(var i = state.snapshots.length - 1; i >= 0; i--){
      var records = state.snapshots[i].records || [];
      for(var j = 0; j < records.length; j++){
        if(records[j].name === name) return records[j];
      }
    }
    return null;
  }

  function snapshot(label){
    label = String(label || 'snapshot');
    var snap = {
      index: state.snapshots.length,
      label: label,
      at: new Date().toISOString(),
      records: []
    };
    TARGETS.forEach(function(name){
      var record = describeValue(name, readValue(name));
      var previous = previousRecord(name);
      record.changed = previous ? !hasSameFingerprint(record, previous) : false;
      record.previousLabel = previous ? previous.label : '';
      record.label = label;
      snap.records.push(record);
    });
    state.snapshots.push(snap);
    return snap.records;
  }

  function flatten(){
    var rows = [];
    state.snapshots.forEach(function(snap){
      (snap.records || []).forEach(function(record){
        rows.push({
          step: snap.index,
          label: snap.label,
          name: record.name,
          changed: record.changed,
          kind: record.kind,
          functionName: record.functionName,
          arity: record.arity,
          chars: record.chars,
          hash: record.hash,
          previousLabel: record.previousLabel
        });
      });
    });
    return rows;
  }

  function latestRecord(name){
    for(var i = state.snapshots.length - 1; i >= 0; i--){
      var records = state.snapshots[i].records || [];
      for(var j = 0; j < records.length; j++){
        if(records[j].name === name) return records[j];
      }
    }
    return describeValue(name, readValue(name));
  }

  function lastChangedLabel(name){
    for(var i = state.snapshots.length - 1; i >= 0; i--){
      var records = state.snapshots[i].records || [];
      for(var j = 0; j < records.length; j++){
        if(records[j].name === name && records[j].changed) return records[j].label;
      }
    }
    return '';
  }

  function changeCount(name){
    var count = 0;
    state.snapshots.forEach(function(snap){
      (snap.records || []).forEach(function(record){
        if(record.name === name && record.changed) count++;
      });
    });
    return count;
  }

  function getReport(){
    return TARGETS.map(function(name){
      var latest = latestRecord(name);
      return {
        name: name,
        owner: lastChangedLabel(name) || 'not measured',
        kind: latest.kind,
        functionName: latest.functionName,
        arity: latest.arity,
        chars: latest.chars,
        hash: latest.hash,
        changes: changeCount(name),
        snapshots: state.snapshots.length
      };
    });
  }

  function getTimeline(){
    return flatten();
  }

  function getDetails(){
    return {
      version: VERSION,
      startedAt: state.startedAt,
      targets: TARGETS.slice(),
      snapshots: state.snapshots.map(function(snap){
        return {
          index: snap.index,
          label: snap.label,
          at: snap.at,
          records: snap.records.map(function(record){
            return {
              name: record.name,
              changed: record.changed,
              previousLabel: record.previousLabel,
              kind: record.kind,
              functionName: record.functionName,
              arity: record.arity,
              chars: record.chars,
              hash: record.hash,
              preview: record.preview
            };
          })
        };
      })
    };
  }

  function print(){
    var report = getReport();
    try{
      if(root.console && typeof root.console.table === 'function') root.console.table(report);
      else if(root.console && typeof root.console.log === 'function') root.console.log(report);
    }catch(e){}
    return report;
  }

  function printTimeline(){
    var timeline = getTimeline();
    try{
      if(root.console && typeof root.console.table === 'function') root.console.table(timeline);
      else if(root.console && typeof root.console.log === 'function') root.console.log(timeline);
    }catch(e){}
    return timeline;
  }

  function shouldAutoPrint(){
    var search = '';
    try{ search = (root.location && root.location.search) || ''; }catch(e){}
    if(/[?&]calendarAudit=1(?:&|$)/.test(search)) return true;
    try{ return root.localStorage && root.localStorage.getItem('change_calendar_owner_audit') === 'true'; }catch(e){}
    return false;
  }

  root.ChangeCalendarOwnerAudit = {
    version: VERSION,
    targets: TARGETS.slice(),
    snapshot: snapshot,
    getReport: getReport,
    getTimeline: getTimeline,
    getDetails: getDetails,
    print: print,
    printTimeline: printTimeline
  };

  snapshot('audit installed');

  function printIfEnabled(){
    if(!shouldAutoPrint()) return;
    print();
    printTimeline();
  }

  try{
    if(typeof root.addEventListener === 'function') root.addEventListener('load', function(){ root.setTimeout(printIfEnabled, 0); });
    else if(typeof root.setTimeout === 'function') root.setTimeout(printIfEnabled, 0);
  }catch(e){}
})(window);

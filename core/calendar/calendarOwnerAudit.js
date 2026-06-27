(function(root){
  'use strict';
  if(!root || root.ChangeCalendarOwnerAudit) return;

  var VERSION = '0.1.0329';
  var TARGETS = ['renderCalendar', 'renderMonth', 'setCalView', 'navigate', 'goToday'];
  var state = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    order: 0,
    targets: {}
  };

  function hashText(text){
    var hash = 0;
    text = String(text || '');
    for(var i = 0; i < text.length; i++){
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
  }

  function normalizeFile(file){
    file = String(file || '').replace(/\\/g, '/').replace(/\?.*$/, '');
    file = file.replace(/^https?:\/\/[^/]+\//, '').replace(/^file:\/\/\/?/, '');
    file = file.replace(/^\.\//, '');
    var marker = file.match(/(?:^|\/)((?:core|features|firebase|scripts)\/.*\.js|app\.js|change-pre\.js|change-post\.js)$/);
    return marker ? marker[1] : file;
  }

  function sourceFromStack(){
    var stack = '';
    try{ throw new Error(); }catch(e){ stack = String((e && e.stack) || ''); }
    var lines = stack.split(/\n+/);
    for(var i = 0; i < lines.length; i++){
      var line = lines[i];
      if(line.indexOf('calendarOwnerAudit.js') >= 0) continue;
      var match = line.match(/((?:https?:\/\/|file:\/\/\/|\/|\.\/)?[^()\s]+?\.js)(?:\?[^:\s)]*)?:(\d+):(\d+)/);
      if(match){
        return {
          file: normalizeFile(match[1]),
          line: parseInt(match[2], 10) || 0,
          column: parseInt(match[3], 10) || 0
        };
      }
    }
    return {file: 'unknown', line: 0, column: 0};
  }

  function describeValue(value){
    var kind = typeof value;
    var info = {
      kind: kind,
      functionName: '',
      arity: 0,
      chars: 0,
      hash: ''
    };
    if(kind === 'function'){
      var text = '';
      try{ text = Function.prototype.toString.call(value); }catch(e){}
      info.functionName = value.name || '(anonymous)';
      info.arity = value.length || 0;
      info.chars = text.length;
      info.hash = hashText(text);
    }
    return info;
  }

  function record(name, value, reason){
    var target = state.targets[name];
    if(!target) return value;
    target.value = value;
    var source = reason === 'initial' ? {file: 'pre-audit-current', line: 0, column: 0} : sourceFromStack();
    var info = describeValue(value);
    var entry = {
      order: ++state.order,
      name: name,
      reason: reason || 'set',
      source: source.file,
      line: source.line,
      column: source.column,
      kind: info.kind,
      functionName: info.functionName,
      arity: info.arity,
      chars: info.chars,
      hash: info.hash,
      at: new Date().toISOString()
    };
    target.current = entry;
    target.assignments.push(entry);
    return value;
  }

  function installTarget(name){
    var descriptor = null;
    try{ descriptor = Object.getOwnPropertyDescriptor(root, name); }catch(e){}
    var target = state.targets[name] = {
      name: name,
      installed: false,
      blocked: false,
      blockReason: '',
      value: undefined,
      current: null,
      assignments: []
    };

    if(descriptor && descriptor.configurable === false){
      target.blocked = true;
      target.blockReason = 'non-configurable global';
      try{ target.value = root[name]; }catch(e){}
      record(name, target.value, 'initial');
      return;
    }

    if(descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')) target.value = descriptor.value;
    else {
      try{ target.value = root[name]; }catch(e){}
    }

    try{
      Object.defineProperty(root, name, {
        configurable: true,
        enumerable: descriptor ? descriptor.enumerable : true,
        get: function(){ return target.value; },
        set: function(value){ record(name, value, 'set'); }
      });
      target.installed = true;
    }catch(e){
      target.blocked = true;
      target.blockReason = (e && e.message) ? e.message : 'defineProperty failed';
      return;
    }

    if(typeof target.value !== 'undefined') record(name, target.value, 'initial');
  }

  function reportEntry(name){
    var target = state.targets[name] || {};
    var current = target.current || null;
    return {
      name: name,
      owner: current ? current.source : (target.blocked ? 'blocked' : 'not assigned'),
      line: current ? current.line : '',
      kind: current ? current.kind : typeof target.value,
      functionName: current ? current.functionName : '',
      arity: current ? current.arity : '',
      chars: current ? current.chars : '',
      hash: current ? current.hash : '',
      assignments: target.assignments ? target.assignments.length : 0,
      installed: target.installed === true,
      blocked: target.blocked === true
    };
  }

  function getReport(){
    return TARGETS.map(reportEntry);
  }

  function getDetails(){
    var details = {
      version: VERSION,
      installedAt: state.installedAt,
      targets: {}
    };
    TARGETS.forEach(function(name){
      var target = state.targets[name] || {};
      details.targets[name] = {
        installed: target.installed === true,
        blocked: target.blocked === true,
        blockReason: target.blockReason || '',
        current: target.current || null,
        assignments: (target.assignments || []).slice()
      };
    });
    return details;
  }

  function print(){
    var report = getReport();
    try{
      if(root.console && typeof root.console.table === 'function') root.console.table(report);
      else if(root.console && typeof root.console.log === 'function') root.console.log(report);
    }catch(e){}
    return report;
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
    getReport: getReport,
    getDetails: getDetails,
    print: print
  };

  TARGETS.forEach(installTarget);

  function printIfEnabled(){
    if(!shouldAutoPrint()) return;
    print();
  }

  try{
    if(typeof root.addEventListener === 'function') root.addEventListener('load', function(){ root.setTimeout(printIfEnabled, 0); });
    else if(typeof root.setTimeout === 'function') root.setTimeout(printIfEnabled, 0);
  }catch(e){}
})(window);

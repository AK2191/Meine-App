(function(){
  'use strict';

  var current = '';
  function normalize(view){
    return ['dashboard','calendar','challenges','pollen','settings'].indexOf(view) >= 0 ? view : 'dashboard';
  }
  function apply(view){
    current = normalize(view || current || (location.hash || '').replace('#/','').replace('#','') || 'dashboard');
    if(document.body){
      document.body.classList.toggle('change-view-dashboard', current === 'dashboard');
      document.body.classList.toggle('change-view-calendar', current === 'calendar');
      document.body.classList.toggle('change-view-challenges', current === 'challenges');
      document.body.classList.toggle('change-view-pollen', current === 'pollen');
      document.body.classList.toggle('change-view-settings', current === 'settings');
    }
    var fab = document.getElementById('fab');
    if(fab) fab.style.display = current === 'calendar' ? 'flex' : 'none';
  }
  function install(){
    if(window.setMainView && !window.setMainView.__changeViewState){
      var original = window.setMainView;
      var wrapped = function(view){
        var normalized = normalize(view);
        var result = original.apply(this, arguments);
        setTimeout(function(){ apply(normalized); }, 0);
        return result;
      };
      wrapped.__changeViewState = true;
      window.setMainView = wrapped;
    }
    apply();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  window.addEventListener('hashchange', function(){ setTimeout(apply, 0); }, {passive:true});
  window.ChangeViewState = {apply: apply, current: function(){ return current; }};
})();


/* v0.1.0063 · View cleanup hooks */
(function(){
  'use strict';
  function cleanupDashboardHealth(){
    try{
      document.querySelectorAll('#change-health-summary,#change-health-card,.change-health-card').forEach(function(el){
        if(el.id === 'change-health-summary'){
          el.innerHTML = '';
          el.style.display = 'none';
        }else{
          el.remove();
        }
      });
    }catch(e){}
  }
  function settleChallenges(){
    try{
      if(typeof window.renderChallenges === 'function') window.renderChallenges();
    }catch(e){}
    try{ if(typeof window.renderGroupGoal === 'function') window.renderGroupGoal(); }catch(e){}
    try{ if(typeof window.ensureWeekBar === 'function') window.ensureWeekBar(); }catch(e){}
    try{ if(typeof window.renderWeekBar === 'function') window.renderWeekBar(); }catch(e){}
    try{
      var view = document.getElementById('challenges-view');
      if(view) view.scrollTop = 0;
      var content = document.getElementById('content');
      if(content) content.scrollTop = 0;
    }catch(e){}
  }
  var oldSetMainView = window.setMainView;
  if(typeof oldSetMainView === 'function' && !oldSetMainView.__v0063Cleanup){
    window.setMainView = function(view){
      var result = oldSetMainView.apply(this, arguments);
      setTimeout(function(){
        cleanupDashboardHealth();
        if(view === 'challenges') settleChallenges();
        if(view === 'dashboard') cleanupDashboardHealth();
      }, 40);
      setTimeout(function(){ if(view === 'challenges') settleChallenges(); }, 220);
      return result;
    };
    window.setMainView.__v0063Cleanup = true;
  }
  var oldBuild = window.buildDashboard;
  if(typeof oldBuild === 'function' && !oldBuild.__v0063Cleanup){
    window.buildDashboard = function(){
      var result = oldBuild.apply(this, arguments);
      cleanupDashboardHealth();
      return result;
    };
    window.buildDashboard.__v0063Cleanup = true;
    window.buildDashCards = window.buildDashboard;
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(cleanupDashboardHealth, 120); });
})();

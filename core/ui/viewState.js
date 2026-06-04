(function(){
  'use strict';

  var current = '';
  function normalize(view){
    return ['dashboard','calendar','challenges','pollen'].indexOf(view) >= 0 ? view : 'dashboard';
  }
  function apply(view){
    current = normalize(view || current || (location.hash || '').replace('#/','').replace('#','') || 'dashboard');
    if(document.body){
      document.body.classList.toggle('change-view-dashboard', current === 'dashboard');
      document.body.classList.toggle('change-view-calendar', current === 'calendar');
      document.body.classList.toggle('change-view-challenges', current === 'challenges');
      document.body.classList.toggle('change-view-pollen', current === 'pollen');
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

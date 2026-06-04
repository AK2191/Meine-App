(function(){
  'use strict';

  function render(){
    var body = document.getElementById('pollen-view-body');
    if(!body) return;
    if(window.ChangeWeatherCard && typeof window.ChangeWeatherCard.renderPollenInto === 'function'){
      window.ChangeWeatherCard.renderPollenInto(body);
    } else {
      body.innerHTML = '<div class="change-pollen-panel"><div class="change-pollen-empty">Pollenbereich wird geladen…</div></div>';
    }
  }

  window.renderPollenView = render;
  window.ChangePollenView = { render: render };

  document.addEventListener('DOMContentLoaded', function(){
    if((location.hash || '').replace('#/','').replace('#','') === 'pollen') setTimeout(render, 120);
  });
})();

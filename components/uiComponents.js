/* components/uiComponents.js
 * O1 (Charta): Wiederverwendbare UI-Bausteine leben in components/.
 * KANONISCHE QUELLE fuer: Feature-Karte, Feature-Feld, Stunden-Dropdown,
 * Switch-Row, Status-Pill. Das Markup ist 1:1 aus features/settings/settingsPanel.js
 * uebernommen (keine visuelle Aenderung); settingsPanel nutzt ab jetzt Aliase hierauf.
 * Regel: Neue wiederverwendbare UI IMMER hier ergaenzen - nie lokal duplizieren.
 * Ladereihenfolge: dieses Skript MUSS vor features/settings/settingsPanel.js stehen.
 */
(function(){
  'use strict';

  // esc delegiert (wie bisher settingsPanel) an die kanonische Quelle im CalendarModel.
  function esc(value){
    var model = window.ChangeCalendarModel;
    if(model && model.esc) return model.esc(value);
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function iconMarkup(value){
    var raw = String(value == null ? '' : value);
    if(raw.indexOf('<') === 0) return raw;
    return esc(raw);
  }

  function pill(text, tone){
    return '<span class="change-status-pill '+(tone || '')+'">'+esc(text)+'</span>';
  }

  function featureField(label, inner, hint){
    return '<div class="change-feature-field"><label class="flabel">'+esc(label)+'</label>'+inner+(hint ? '<div class="change-feature-row-sub">'+esc(hint)+'</div>' : '')+'</div>';
  }

  function featureCard(icon, title, badgeText, badgeTone, subtitle, controlHtml, bodyHtml){
    return '<div class="change-settings-feature-card">'
      + '<div class="change-feature-head">'
      + '<div class="change-feature-left"><div class="change-feature-icon">'+iconMarkup(icon)+'</div><div>'
      + '<div class="change-feature-title">'+esc(title)+(badgeText ? ' '+pill(badgeText, badgeTone) : '')+'</div>'
      + (subtitle ? '<div class="change-feature-sub">'+esc(subtitle)+'</div>' : '')
      + '</div></div>'
      + (controlHtml ? '<div class="change-feature-control">'+controlHtml+'</div>' : '')
      + '</div>'
      + (bodyHtml ? '<div class="change-feature-body">'+bodyHtml+'</div>' : '')
      + '</div>';
  }

  // Stunden-Dropdown 05:00-22:00 (bisher 3x dupliziert in settingsPanel).
  // opts.leadingHtml: optionale erste Option (z.B. "Keine" mit value -1).
  function hourSelect(id, selectedHour, opts){
    opts = opts || {};
    var from = Number.isFinite(opts.from) ? opts.from : 5;
    var to = Number.isFinite(opts.to) ? opts.to : 22;
    var s = '<select class="finput" id="'+esc(id)+'">'+(opts.leadingHtml || '');
    for(var h=from; h<=to; h++){
      s += '<option value="'+h+'" '+(h===selectedHour?'selected':'')+'>'+String(h).padStart(2,'0')+':00</option>';
    }
    return s + '</select>';
  }

  function switchRow(title, subtitle, id, checked, disabled){
    return '<div class="change-settings-row"><div><div class="change-settings-title">'+title+'</div>'+(subtitle ? '<div class="change-settings-sub">'+subtitle+'</div>' : '')+'</div><label class="switch"><input type="checkbox" id="'+id+'" '+(checked ? 'checked' : '')+' '+(disabled ? 'disabled' : '')+'><span class="slider"></span></label></div>';
  }

  window.ChangeComponents = {
    esc: esc,
    iconMarkup: iconMarkup,
    pill: pill,
    featureField: featureField,
    featureCard: featureCard,
    hourSelect: hourSelect,
    switchRow: switchRow
  };
})();

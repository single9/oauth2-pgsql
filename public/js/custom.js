function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = "expires="+d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function clearOverlayAndReload(jqElem, duration) {
  setTimeout(function() {
    jqElem.addClass('d-none');
    window.location.reload();
  }, duration);
}

/* -- for user settings -- */
var overlayDuration = 200;
$('#update-user-info').submit(function(ev) {
  ev.preventDefault();

  var updateOverlay = $('#update-overlay');
  var formData = new FormData(ev.target);
  var object = {};

  formData.forEach((value, key) => {object[key] = value});

  updateOverlay.removeClass('d-none');
  $.ajax(ev.target.action, {
    method: 'POST',
    async: true,
    contentType: 'application/json; charset=UTF-8',
    data: JSON.stringify(object),
  }).done(function() {
    clearOverlayAndReload(updateOverlay, overlayDuration);
  }).fail(function() {
    clearOverlayAndReload(updateOverlay, overlayDuration);
  });
});
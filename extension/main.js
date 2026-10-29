// Sayfanin kendi dunyasinda calisir; oynatici API'sinden video kimligini
// okuyup content.js'in gorebilecegi bir DOM ozelligine yazar.
setInterval(() => {
  try {
    const id = document.getElementById('movie_player')?.getVideoData?.().video_id;
    if (id) document.documentElement.dataset.ytmVid = id;
    else delete document.documentElement.dataset.ytmVid;
  } catch {}
}, 1000);

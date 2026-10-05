# CodeAlpha_MusicPlayer

Task 4 of the CodeAlpha Frontend Development internship: a music player built with HTML, CSS and JavaScript.

## Features
- Play, pause, next and previous
- Shows song title, artist and duration (read from the audio file)
- Progress bar you can drag, and a volume slider with mute
- Bonus: playlist, autoplay next song, shuffle, repeat (off / all / one)
- Add songs from your own device with "Add your songs"
- Keyboard shortcuts: Space play/pause, N next, P previous, M mute, S shuffle, R repeat, arrow keys seek and change volume

## Run it
Open `index.html` in a browser. The sample songs stream from soundhelix.com, so you need an internet connection.

## Use your own songs
Create an `audio` folder, add your mp3 files, and edit the `TRACKS` array in `script.js`:
`{ title: "My song", artist: "Me", src: "audio/my-song.mp3", hue: 200 }`

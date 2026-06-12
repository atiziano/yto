@echo off
:: Chiude eventuali istanze di nw.exe rimaste bloccate in background
:: Il comando "2>nul" serve a non mostrare messaggi di errore se il programma non era già aperto
taskkill /f /im nw.exe 2>nul

:: Avvia Karaoke Pro
start "" "%~dp0bin\nw\nw.exe" "%~dp0."
exit

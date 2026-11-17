@echo off
chcp 65001 >nul
setlocal
rem Model Download Sorter: opens the extensions page and copies the folder path.
rem Usage: install.cmd [chrome^|yandex]

set "EXT=%~dp0"
if "%EXT:~-1%"=="\" set "EXT=%EXT:~0,-1%"

set "CHROME="
for %%P in ("%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe") do if not defined CHROME if exist %%P set "CHROME=%%~P"
set "YANDEX="
for %%P in ("%LOCALAPPDATA%\Yandex\YandexBrowser\Application\browser.exe" "%ProgramFiles%\Yandex\YandexBrowser\Application\browser.exe" "%ProgramFiles(x86)%\Yandex\YandexBrowser\Application\browser.exe") do if not defined YANDEX if exist %%P set "YANDEX=%%~P"

set "WHICH=%~1"
if not defined WHICH (
  if defined CHROME if defined YANDEX (
    choice /c CY /m "Куда устанавливать: C = Chrome, Y = Яндекс Браузер"
    if errorlevel 2 (set "WHICH=yandex") else (set "WHICH=chrome")
  )
)
if not defined WHICH if defined CHROME set "WHICH=chrome"
if not defined WHICH if defined YANDEX set "WHICH=yandex"
if not defined WHICH (
  echo Не найден ни Chrome, ни Яндекс Браузер.
  pause
  exit /b 1
)

<nul set /p "=%EXT%" | clip

if /i "%WHICH%"=="yandex" (
  if not defined YANDEX echo Яндекс Браузер не найден.& pause & exit /b 1
  start "" "%YANDEX%" "browser://extensions"
  set "PAGE=browser://extensions"
) else (
  if not defined CHROME echo Chrome не найден.& pause & exit /b 1
  start "" "%CHROME%" "chrome://extensions"
  set "PAGE=chrome://extensions"
)

echo.
echo  Сортировщик 3D-моделей — установка
echo  ----------------------------------
echo  Браузер открыт на странице %PAGE%
echo  Путь к папке расширения уже в буфере обмена:
echo    %EXT%
echo.
echo  1. Справа вверху включите «Режим разработчика».
echo  2. Нажмите «Загрузить распакованное расширение».
echo  3. В окне выбора щёлкните в адресную строку вверху, нажмите Ctrl+V и Enter,
echo     затем «Выбор папки».
echo  4. Появится карточка «Сортировщик 3D-моделей» — готово.
echo.
echo  Если страница расширений не открылась, вставьте %PAGE% в адресную строку вручную.
echo  Папку расширения после установки не перемещайте.
echo.
pause

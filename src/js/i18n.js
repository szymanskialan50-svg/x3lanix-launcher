/**
 * X3LANIX LAUNCHER — Internationalization
 * Languages: PL (Polish), EN (English), RU (Russian)
 */
const translations = {
  PL: {
    // Login Screen
    login_title: 'Account Manager',
    login_subtitle: 'X3LANIX | 0 kont',
    login_no_accounts: 'Brak kont.',
    login_username: 'Nazwa użytkownika...',
    login_password: 'Hasło...',
    login_random: 'Losowy',
    login_microsoft: 'Microsoft',
    login_offline: 'Token',
    login_continue: 'Kontynuuj',

    // Directory Select
    dir_title: 'Wybierz lokalizację gry',
    dir_subtitle: 'Wybierz folder, w którym zostanie zainstalowany klient.',
    dir_select: 'Wybierz folder',
    dir_continue: 'Kontynuuj',

    // Language Select
    lang_title: 'Wybierz język',
    lang_subtitle: 'Wybierz język dla klienta.',

    // Downloading Screen
    dl_title: 'x3lanix client',
    dl_checking: 'Sprawdzanie plików klienta...',
    dl_downloading: 'Pobieranie części modułu klienta',
    dl_installing_fabric: 'Instalowanie Fabric Loader...',
    dl_downloading_mods: 'Pobieranie modów...',
    dl_cancel: 'Anuluj',
    dl_complete: 'Zakończono!',

    // Main Menu — Sidebar
    nav_play: 'Graj',
    nav_settings: 'Ustawienia',
    nav_account: 'Konto',
    nav_mods: 'Mody',
    nav_quit: 'Wyjdź',

    // Play Tab
    play_client: 'x3lanix client',
    play_ready: 'Gotowy do uruchomienia',
    play_desc: 'x3lanix - Client',
    play_subscription: 'SUBSKRYPCJA',
    play_subscription_value: 'Lifetime',
    play_nickname: 'NICK W GRZE',
    play_launch: 'Uruchom grę',

    // Settings Tab
    settings_title: 'Ustawienia',
    settings_language: 'JĘZYK',
    settings_nickname: 'NICK W GRZE',
    settings_ram: 'PRZYDZIAŁ RAM',
    settings_ram_unit: 'MB',
    settings_window_size: 'ROZMIAR OKNA GRY',
    settings_game_location: 'LOKALIZACJA GRY',
    settings_fullscreen: 'Uruchom w pełnym ekranie',
    settings_reinstall: 'Przeinstaluj klienta',
    settings_zgc: 'ZGC Generational (4-8 GB)',

    // Account Tab
    account_title: 'Konto',
    account_username: 'Nazwa użytkownika',
    account_uuid: 'UUID',
    account_type: 'Typ logowania',
    account_logout: 'Wyloguj się',

    // Mods Tab
    mods_title: 'Mody',
    mods_loading: 'Ładowanie modów...',
    mods_empty: 'Brak zainstalowanych modów.',
    mods_enabled: 'Włączony',
    mods_disabled: 'Wyłączony',
    mods_drop_text: 'Przeciągnij pliki .jar tutaj',
    mods_drop_hint: 'lub użyj przycisku "+ Dodaj Mod"',
    mods_add: '+ Dodaj Mod',
    
    // Console
    console_title: 'Konsola',
    console_clear: 'Wyczyść',
    console_waiting: 'Oczekiwanie na odpalanie gry...',

    // New — from x3lanix lancher
    play_mc_version: 'WERSJA MC',
    settings_mc_version: 'WERSJA MINECRAFT',
    settings_java_distro: 'DYSTRYBUCJA JAVA',
    settings_custom_java: 'ŚCIEŻKA DO JAVY',
    settings_concurrent: 'POBIERANIE RÓWNOLEGŁE',
    settings_concurrent_unit: 'połączeń',
    settings_keep_open: 'Nie zamykaj launchera po uruchomieniu',
    version_select_title: 'Wybierz wersję',
    first_run_message: 'Witaj w x3lanix — premium Minecraft launcher z Fabric mods. Launcher automatycznie zainstaluje Minecraft, Fabric Loader i wybrane mody. Upewnij się, że masz połączenie z internetem.',
    first_run_continue: 'Zrozumiałem, kontynuuj'
  },

  EN: {
    // Login Screen
    login_title: 'Account Manager',
    login_subtitle: 'X3LANIX | 0 accounts',
    login_no_accounts: 'No accounts.',
    login_username: 'Username...',
    login_password: 'Password...',
    login_random: 'Random',
    login_microsoft: 'Microsoft',
    login_offline: 'Token',
    login_continue: 'Continue',

    // Directory Select
    dir_title: 'Select Game Location',
    dir_subtitle: 'Choose a folder where the client will be installed.',
    dir_select: 'Select Folder',
    dir_continue: 'Continue',

    // Language Select
    lang_title: 'Select Language',
    lang_subtitle: 'Choose a language for the client.',

    // Downloading Screen
    dl_title: 'x3lanix client',
    dl_checking: 'Checking client files...',
    dl_downloading: 'Downloading client module part',
    dl_installing_fabric: 'Installing Fabric Loader...',
    dl_downloading_mods: 'Downloading mods...',
    dl_cancel: 'Cancel',
    dl_complete: 'Complete!',

    // Main Menu — Sidebar
    nav_play: 'Play',
    nav_settings: 'Settings',
    nav_account: 'Account',
    nav_mods: 'Mods',
    nav_quit: 'Quit',

    // Play Tab
    play_client: 'x3lanix client',
    play_ready: 'Ready to launch',
    play_desc: 'x3lanix - Client',
    play_subscription: 'SUBSCRIPTION',
    play_subscription_value: 'Lifetime',
    play_nickname: 'IN-GAME NICK',
    play_launch: 'Launch Game',

    // Settings Tab
    settings_title: 'Settings',
    settings_language: 'LANGUAGE',
    settings_nickname: 'IN-GAME NICK',
    settings_ram: 'RAM ALLOCATION',
    settings_ram_unit: 'MB',
    settings_window_size: 'GAME WINDOW SIZE',
    settings_game_location: 'GAME LOCATION',
    settings_fullscreen: 'Launch in fullscreen',
    settings_reinstall: 'Reinstall client',
    settings_zgc: 'ZGC Generational (4-8 GB)',

    // Account Tab
    account_title: 'Account',
    account_username: 'Username',
    account_uuid: 'UUID',
    account_type: 'Login Type',
    account_logout: 'Log Out',

    // Mods Tab
    mods_title: 'Mods',
    mods_loading: 'Loading mods...',
    mods_empty: 'No mods installed.',
    mods_enabled: 'Enabled',
    mods_disabled: 'Disabled',
    mods_drop_text: 'Drop .jar files here',
    mods_drop_hint: 'or use the "+ Add Mod" button',
    mods_add: '+ Add Mod',
    
    // Console
    console_title: 'Console',
    console_clear: 'Clear',
    console_waiting: 'Waiting for game to launch...',

    // New — from x3lanix lancher
    play_mc_version: 'MC VERSION',
    settings_mc_version: 'MINECRAFT VERSION',
    settings_java_distro: 'JAVA DISTRIBUTION',
    settings_custom_java: 'CUSTOM JAVA PATH',
    settings_concurrent: 'CONCURRENT DOWNLOADS',
    settings_concurrent_unit: 'connections',
    settings_keep_open: 'Keep launcher running after launch',
    version_select_title: 'Select Version',
    first_run_message: 'Welcome to x3lanix — a premium Minecraft launcher with Fabric mods. The launcher will automatically install Minecraft, Fabric Loader, and selected mods. Make sure you have an internet connection.',
    first_run_continue: 'Got it, continue'
  },

  RU: {
    // Login Screen
    login_title: 'Менеджер аккаунтов',
    login_subtitle: 'X3LANIX | 0 аккаунтов',
    login_no_accounts: 'Нет аккаунтов.',
    login_username: 'Имя пользователя...',
    login_password: 'Пароль...',
    login_random: 'Случайный',
    login_microsoft: 'Microsoft',
    login_offline: 'Токен',
    login_continue: 'Продолжить',

    // Directory Select
    dir_title: 'Выберите расположение игры',
    dir_subtitle: 'Выберите папку для установки клиента.',
    dir_select: 'Выбрать папку',
    dir_continue: 'Продолжить',

    // Language Select
    lang_title: 'Выберите язык',
    lang_subtitle: 'Выберите язык для клиента.',

    // Downloading Screen
    dl_title: 'x3lanix client',
    dl_checking: 'Проверка файлов клиента...',
    dl_downloading: 'Загрузка модуля клиента',
    dl_installing_fabric: 'Установка Fabric Loader...',
    dl_downloading_mods: 'Загрузка модов...',
    dl_cancel: 'Отмена',
    dl_complete: 'Завершено!',

    // Main Menu — Sidebar
    nav_play: 'Играть',
    nav_settings: 'Настройки',
    nav_account: 'Аккаунт',
    nav_mods: 'Моды',
    nav_quit: 'Выход',

    // Play Tab
    play_client: 'x3lanix client',
    play_ready: 'Готов к запуску',
    play_desc: 'x3lanix - Client',
    play_subscription: 'ПОДПИСКА',
    play_subscription_value: 'Пожизненная',
    play_nickname: 'НИК В ИГРЕ',
    play_launch: 'Запустить игру',

    // Settings Tab
    settings_title: 'Настройки',
    settings_language: 'ЯЗЫК',
    settings_nickname: 'НИК В ИГРЕ',
    settings_ram: 'ВЫДЕЛЕНИЕ RAM',
    settings_ram_unit: 'МБ',
    settings_window_size: 'РАЗМЕР ОКНА ИГРЫ',
    settings_game_location: 'РАСПОЛОЖЕНИЕ ИГРЫ',
    settings_fullscreen: 'Запуск в полноэкранном режиме',
    settings_reinstall: 'Переустановить клиент',
    settings_zgc: 'ZGC Generational (4-8 ГБ)',

    // Account Tab
    account_title: 'Аккаунт',
    account_username: 'Имя пользователя',
    account_uuid: 'UUID',
    account_type: 'Тип входа',
    account_logout: 'Выйти',

    // Mods Tab
    mods_title: 'Моды',
    mods_loading: 'Загрузка модов...',
    mods_empty: 'Моды не установлены.',
    mods_enabled: 'Включен',
    mods_disabled: 'Отключен',
    mods_drop_text: 'Перетащите файлы .jar сюда',
    mods_drop_hint: 'или нажмите кнопку "+ Добавить мод"',
    mods_add: '+ Добавить мод',
    
    // Console
    console_title: 'Консоль',
    console_clear: 'Очистить',
    console_waiting: 'Ожидание запуска игры...',

    // New — from x3lanix lancher
    play_mc_version: 'ВЕРСИЯ MC',
    settings_mc_version: 'ВЕРСИЯ MINECRAFT',
    settings_java_distro: 'ДИСТРИБУЦИЯ JAVA',
    settings_custom_java: 'ПУТЬ К JAVA',
    settings_concurrent: 'ПАРАЛЛЕЛЬНЫЕ ЗАГРУЗКИ',
    settings_concurrent_unit: 'соединений',
    settings_keep_open: 'Не закрывать лаунчер после запуска',
    version_select_title: 'Выберите версию',
    first_run_message: 'Добро пожаловать в x3lanix — премиум Minecraft лаунчер с Fabric модами. Лаунчер автоматически установит Minecraft, Fabric Loader и выбранные моды. Убедитесь, что у вас есть подключение к интернету.',
    first_run_continue: 'Понятно, продолжить'
  }
};

let currentLang = 'PL';

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
  }
}

function t(key) {
  return translations[currentLang]?.[key] || translations['EN']?.[key] || key;
}

function getLanguage() {
  return currentLang;
}

// Make accessible globally in renderer
if (typeof window !== 'undefined') {
  window.i18n = { t, setLanguage, getLanguage, translations };
}

// UI text in every language listed in app.json `supported_languages`.
// No imports: scripts/check-text.ts loads this file directly with Node and
// checks that every glasses string fits its row and uses glyphs the G2 fonts have.

// Same order as app.json; the first one is the fallback.
export const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'zh', 'ja', 'ko'] as const;
export type Lang = (typeof LANGUAGES)[number];

export interface Strings {
  glasses: {
    // Status line labels, e.g. "▶  WORK · 1/4"
    work: string;
    shortBreak: string;
    longBreak: string;
    // Phase-end alerts, e.g. "★ Break time!"
    alertWork: string;
    alertBreak: string;
    alertLongBreak: string;
    // Footer while running; `time` is the local clock time, e.g. "14:35"
    endsAt: (time: string) => string;
    // Footer while waiting; the gesture opening the contextual menu is tap then long press
    tapToStart: string;
    tapToResume: string;
    // Footer while a phase-end alert is up; `duration` is the next phase, e.g. "05:00"
    tapToStartNext: (duration: string) => string;
    // Footer for a few seconds after a swipe
    gestureHint: string;
    // Contextual menu items: at most 32 UTF-8 bytes, verbs
    menuSkip: string;
    menuReset: string;
  };
  phone: {
    title: string;
    // Phase names, the page heading
    work: string;
    shortBreak: string;
    longBreak: string;
    // Timer state under the heading; the phase-end alerts come from `glasses`
    ready: string;
    running: string;
    paused: string;
    endsAt: (time: string) => string;
    sessions: (done: number, total: number) => string;
    start: string;
    pause: string;
    resume: string;
    skip: string;
    reset: string;
    progressLabel: string;
    settingsTitle: string;
    workLength: string;
    shortBreakLength: string;
    longBreakLength: string;
    sessionsPerSet: string;
    minutes: (n: number) => string;
    // Screen-reader labels of the − / + buttons; `setting` is one of the *Length labels above
    decrease: (setting: string) => string;
    increase: (setting: string) => string;
    settingsNote: string;
    helpTitle: string;
    // [gesture, what it does]
    helpGestures: Array<[string, string]>;
    helpAlert: string;
    preview: string;
  };
}

// Spanish and Italian take a singular article before one o'clock ("a la 1:30", "all'1:30").
const isOneOClock = (time: string) => /^0?1\D/.test(time);

const en: Strings = {
  glasses: {
    work: 'WORK',
    shortBreak: 'SHORT BREAK',
    longBreak: 'LONG BREAK',
    alertWork: 'Back to work!',
    alertBreak: 'Break time!',
    alertLongBreak: 'Long break time!',
    endsAt: (time) => `Ends at ${time}`,
    tapToStart: 'Tap to start · Tap + hold: menu',
    tapToResume: 'Tap to resume · Tap + hold: menu',
    tapToStartNext: (duration) => `Tap to start · ${duration}`,
    gestureHint: 'Tap: start/pause · Tap + hold: menu',
    menuSkip: 'Skip',
    menuReset: 'Reset',
  },
  phone: {
    title: 'Pomodoro',
    work: 'Work',
    shortBreak: 'Short break',
    longBreak: 'Long break',
    ready: 'Ready',
    running: 'Running',
    paused: 'Paused',
    endsAt: (time) => `Ends at ${time}`,
    sessions: (done, total) => `${done} of ${total} sessions`,
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    skip: 'Skip',
    reset: 'Reset',
    progressLabel: 'Phase progress',
    settingsTitle: 'Timer',
    workLength: 'Work',
    shortBreakLength: 'Short break',
    longBreakLength: 'Long break',
    sessionsPerSet: 'Sessions before a long break',
    minutes: (n) => `${n} min`,
    decrease: (setting) => `Decrease ${setting}`,
    increase: (setting) => `Increase ${setting}`,
    settingsNote: 'A phase that has already started keeps its length; changes apply from the next one.',
    helpTitle: 'On your glasses',
    helpGestures: [
      ['Tap', 'Start or pause'],
      ['Tap, then hold', 'Menu: Skip, Reset'],
      ['Swipe', 'Show the gestures'],
      ['Double-tap', 'Exit'],
    ],
    helpAlert: "The glasses can't play sounds, so when a phase ends the status line blinks and the timer counts the extra time until you start the next phase.",
    preview: 'Browser preview: glasses not connected.',
  },
};

const es: Strings = {
  glasses: {
    work: 'TRABAJO',
    shortBreak: 'DESCANSO CORTO',
    longBreak: 'DESCANSO LARGO',
    alertWork: '¡A trabajar!',
    alertBreak: '¡Hora de descansar!',
    alertLongBreak: '¡Hora del descanso largo!',
    endsAt: (time) => `Termina ${isOneOClock(time) ? 'a la' : 'a las'} ${time}`,
    tapToStart: 'Toca para empezar · Toca + mantén: menú',
    tapToResume: 'Toca para reanudar · Toca + mantén: menú',
    tapToStartNext: (duration) => `Toca para empezar · ${duration}`,
    gestureHint: 'Toca: iniciar/pausar · Toca + mantén: menú',
    menuSkip: 'Saltar',
    menuReset: 'Reiniciar',
  },
  phone: {
    title: 'Pomodoro',
    work: 'Trabajo',
    shortBreak: 'Descanso corto',
    longBreak: 'Descanso largo',
    ready: 'Listo',
    running: 'En marcha',
    paused: 'En pausa',
    endsAt: (time) => `Termina ${isOneOClock(time) ? 'a la' : 'a las'} ${time}`,
    sessions: (done, total) => `${done} de ${total} sesiones`,
    start: 'Iniciar',
    pause: 'Pausar',
    resume: 'Reanudar',
    skip: 'Saltar',
    reset: 'Reiniciar',
    progressLabel: 'Progreso de la fase',
    settingsTitle: 'Temporizador',
    workLength: 'Trabajo',
    shortBreakLength: 'Descanso corto',
    longBreakLength: 'Descanso largo',
    sessionsPerSet: 'Sesiones antes de un descanso largo',
    minutes: (n) => `${n} min`,
    decrease: (setting) => `Reducir ${setting.toLowerCase()}`,
    increase: (setting) => `Aumentar ${setting.toLowerCase()}`,
    settingsNote: 'Una fase ya iniciada conserva su duración; los cambios se aplican desde la siguiente.',
    helpTitle: 'En tus gafas',
    helpGestures: [
      ['Tocar', 'Iniciar o pausar'],
      ['Tocar y luego mantener', 'Menú: Saltar, Reiniciar'],
      ['Deslizar', 'Mostrar los gestos'],
      ['Doble toque', 'Salir'],
    ],
    helpAlert: 'Las gafas no pueden reproducir sonidos, así que cuando termina una fase la línea de estado parpadea y el temporizador cuenta el tiempo extra hasta que empieces la siguiente.',
    preview: 'Vista previa en el navegador: gafas no conectadas.',
  },
};

const fr: Strings = {
  glasses: {
    work: 'TRAVAIL',
    shortBreak: 'PAUSE COURTE',
    longBreak: 'PAUSE LONGUE',
    alertWork: 'Au travail !',
    alertBreak: "C'est la pause !",
    alertLongBreak: "C'est la pause longue !",
    endsAt: (time) => `Fin à ${time}`,
    tapToStart: 'Touchez pour démarrer · Touchez + maintenez : menu',
    tapToResume: 'Touchez pour reprendre · Touchez + maintenez : menu',
    tapToStartNext: (duration) => `Touchez pour démarrer · ${duration}`,
    gestureHint: 'Touchez : démarrer/pause · Touchez + maintenez : menu',
    menuSkip: 'Passer',
    menuReset: 'Réinitialiser',
  },
  phone: {
    title: 'Pomodoro',
    work: 'Travail',
    shortBreak: 'Pause courte',
    longBreak: 'Pause longue',
    ready: 'Prêt',
    running: 'En cours',
    paused: 'En pause',
    endsAt: (time) => `Fin à ${time}`,
    sessions: (done, total) => `Sessions terminées : ${done} sur ${total}`,
    start: 'Démarrer',
    pause: 'Pause',
    resume: 'Reprendre',
    skip: 'Passer',
    reset: 'Réinitialiser',
    progressLabel: 'Progression de la phase',
    settingsTitle: 'Minuteur',
    workLength: 'Travail',
    shortBreakLength: 'Pause courte',
    longBreakLength: 'Pause longue',
    sessionsPerSet: 'Sessions avant une pause longue',
    minutes: (n) => `${n} min`,
    decrease: (setting) => `Diminuer : ${setting.toLowerCase()}`,
    increase: (setting) => `Augmenter : ${setting.toLowerCase()}`,
    settingsNote: "Une phase déjà commencée garde sa durée ; les changements s'appliquent à partir de la suivante.",
    helpTitle: 'Sur vos lunettes',
    helpGestures: [
      ['Toucher', 'Démarrer ou mettre en pause'],
      ['Toucher, puis maintenir', 'Menu : Passer, Réinitialiser'],
      ['Balayer', 'Afficher les gestes'],
      ['Toucher deux fois', 'Quitter'],
    ],
    helpAlert: "Les lunettes ne peuvent pas émettre de son : à la fin d'une phase, la ligne d'état clignote et le minuteur compte le temps supplémentaire jusqu'à ce que vous lanciez la phase suivante.",
    preview: 'Aperçu dans le navigateur : lunettes non connectées.',
  },
};

const de: Strings = {
  glasses: {
    work: 'ARBEIT',
    shortBreak: 'KURZE PAUSE',
    longBreak: 'LANGE PAUSE',
    alertWork: 'Zurück an die Arbeit!',
    alertBreak: 'Zeit für eine Pause!',
    alertLongBreak: 'Zeit für die lange Pause!',
    endsAt: (time) => `Endet um ${time}`,
    tapToStart: 'Tippen zum Starten · Tippen + Halten: Menü',
    tapToResume: 'Tippen zum Fortsetzen · Tippen + Halten: Menü',
    tapToStartNext: (duration) => `Tippen zum Starten · ${duration}`,
    gestureHint: 'Tippen: Start/Pause · Tippen + Halten: Menü',
    menuSkip: 'Überspringen',
    menuReset: 'Zurücksetzen',
  },
  phone: {
    title: 'Pomodoro',
    work: 'Arbeit',
    shortBreak: 'Kurze Pause',
    longBreak: 'Lange Pause',
    ready: 'Bereit',
    running: 'Läuft',
    paused: 'Pausiert',
    endsAt: (time) => `Endet um ${time}`,
    sessions: (done, total) => `${done} von ${total} Sitzungen`,
    start: 'Starten',
    pause: 'Pausieren',
    resume: 'Fortsetzen',
    skip: 'Überspringen',
    reset: 'Zurücksetzen',
    progressLabel: 'Fortschritt der Phase',
    settingsTitle: 'Timer',
    workLength: 'Arbeit',
    shortBreakLength: 'Kurze Pause',
    longBreakLength: 'Lange Pause',
    sessionsPerSet: 'Sitzungen bis zur langen Pause',
    minutes: (n) => `${n} Min.`,
    decrease: (setting) => `${setting} verringern`,
    increase: (setting) => `${setting} erhöhen`,
    settingsNote: 'Eine bereits gestartete Phase behält ihre Länge; Änderungen gelten ab der nächsten.',
    helpTitle: 'Auf deiner Brille',
    helpGestures: [
      ['Tippen', 'Starten oder pausieren'],
      ['Tippen, dann halten', 'Menü: Überspringen, Zurücksetzen'],
      ['Wischen', 'Gesten anzeigen'],
      ['Doppeltippen', 'Beenden'],
    ],
    helpAlert: 'Die Brille kann keine Töne abspielen. Wenn eine Phase endet, blinkt deshalb die Statuszeile, und der Timer zählt die zusätzliche Zeit, bis du die nächste Phase startest.',
    preview: 'Browser-Vorschau: Brille nicht verbunden.',
  },
};

const it: Strings = {
  glasses: {
    work: 'LAVORO',
    shortBreak: 'PAUSA BREVE',
    longBreak: 'PAUSA LUNGA',
    alertWork: 'Torna al lavoro!',
    alertBreak: 'È ora della pausa!',
    alertLongBreak: 'È ora della pausa lunga!',
    endsAt: (time) => `Termina ${isOneOClock(time) ? "all'" : 'alle '}${time}`,
    tapToStart: 'Tocca per iniziare · Tocca + tieni premuto: menu',
    tapToResume: 'Tocca per riprendere · Tocca + tieni premuto: menu',
    tapToStartNext: (duration) => `Tocca per iniziare · ${duration}`,
    gestureHint: 'Tocca: avvia/pausa · Tocca + tieni premuto: menu',
    menuSkip: 'Salta',
    menuReset: 'Azzera',
  },
  phone: {
    title: 'Pomodoro',
    work: 'Lavoro',
    shortBreak: 'Pausa breve',
    longBreak: 'Pausa lunga',
    ready: 'Pronto',
    running: 'In corso',
    paused: 'In pausa',
    endsAt: (time) => `Termina ${isOneOClock(time) ? "all'" : 'alle '}${time}`,
    sessions: (done, total) => `${done} di ${total} sessioni`,
    start: 'Avvia',
    pause: 'Pausa',
    resume: 'Riprendi',
    skip: 'Salta',
    reset: 'Azzera',
    progressLabel: 'Avanzamento della fase',
    settingsTitle: 'Timer',
    workLength: 'Lavoro',
    shortBreakLength: 'Pausa breve',
    longBreakLength: 'Pausa lunga',
    sessionsPerSet: 'Sessioni prima di una pausa lunga',
    minutes: (n) => `${n} min`,
    decrease: (setting) => `Diminuisci ${setting.toLowerCase()}`,
    increase: (setting) => `Aumenta ${setting.toLowerCase()}`,
    settingsNote: 'Una fase già iniziata mantiene la sua durata; le modifiche valgono dalla successiva.',
    helpTitle: 'Sui tuoi occhiali',
    helpGestures: [
      ['Tocca', 'Avvia o metti in pausa'],
      ['Tocca, poi tieni premuto', 'Menu: Salta, Azzera'],
      ['Scorri', 'Mostra i gesti'],
      ['Doppio tocco', 'Esci'],
    ],
    helpAlert: 'Gli occhiali non possono riprodurre suoni: quando una fase finisce, la riga di stato lampeggia e il timer conta il tempo extra finché non avvii la fase successiva.',
    preview: 'Anteprima nel browser: occhiali non collegati.',
  },
};

const zh: Strings = {
  glasses: {
    work: '工作',
    shortBreak: '短休息',
    longBreak: '长休息',
    alertWork: '该工作了！',
    alertBreak: '休息一下吧！',
    alertLongBreak: '长休息时间到了！',
    endsAt: (time) => `${time} 结束`,
    tapToStart: '轻点开始 · 轻点 + 按住：菜单',
    tapToResume: '轻点继续 · 轻点 + 按住：菜单',
    tapToStartNext: (duration) => `轻点开始 · ${duration}`,
    gestureHint: '轻点：开始/暂停 · 轻点 + 按住：菜单',
    menuSkip: '跳过',
    menuReset: '重置',
  },
  phone: {
    title: 'Pomodoro',
    work: '工作',
    shortBreak: '短休息',
    longBreak: '长休息',
    ready: '就绪',
    running: '进行中',
    paused: '已暂停',
    endsAt: (time) => `${time} 结束`,
    sessions: (done, total) => `已完成 ${done}/${total} 轮`,
    start: '开始',
    pause: '暂停',
    resume: '继续',
    skip: '跳过',
    reset: '重置',
    progressLabel: '阶段进度',
    settingsTitle: '计时器',
    workLength: '工作',
    shortBreakLength: '短休息',
    longBreakLength: '长休息',
    sessionsPerSet: '长休息前的轮数',
    minutes: (n) => `${n} 分钟`,
    decrease: (setting) => `减少${setting}`,
    increase: (setting) => `增加${setting}`,
    settingsNote: '已开始的阶段保持原有时长，更改从下一阶段起生效。',
    helpTitle: '在眼镜上',
    helpGestures: [
      ['轻点', '开始或暂停'],
      ['轻点后按住', '菜单：跳过、重置'],
      ['滑动', '显示手势'],
      ['双击', '退出'],
    ],
    helpAlert: '眼镜无法播放声音，因此阶段结束时状态栏会闪烁，计时器会累计超出的时间，直到你开始下一个阶段。',
    preview: '浏览器预览：未连接眼镜。',
  },
};

const ja: Strings = {
  glasses: {
    work: '作業',
    shortBreak: '短い休憩',
    longBreak: '長い休憩',
    alertWork: '作業に戻りましょう！',
    alertBreak: '休憩しましょう！',
    alertLongBreak: '長い休憩の時間です！',
    endsAt: (time) => `${time} に終了`,
    tapToStart: 'タップで開始 · タップ + 長押し：メニュー',
    tapToResume: 'タップで再開 · タップ + 長押し：メニュー',
    tapToStartNext: (duration) => `タップで開始 · ${duration}`,
    gestureHint: 'タップ：開始/一時停止 · タップ + 長押し：メニュー',
    menuSkip: 'スキップ',
    menuReset: 'リセット',
  },
  phone: {
    title: 'Pomodoro',
    work: '作業',
    shortBreak: '短い休憩',
    longBreak: '長い休憩',
    ready: '準備完了',
    running: '実行中',
    paused: '一時停止中',
    endsAt: (time) => `${time} に終了`,
    sessions: (done, total) => `${total} 回中 ${done} 回完了`,
    start: '開始',
    pause: '一時停止',
    resume: '再開',
    skip: 'スキップ',
    reset: 'リセット',
    progressLabel: 'フェーズの進捗',
    settingsTitle: 'タイマー',
    workLength: '作業',
    shortBreakLength: '短い休憩',
    longBreakLength: '長い休憩',
    sessionsPerSet: '長い休憩までのセッション数',
    minutes: (n) => `${n} 分`,
    decrease: (setting) => `${setting}を減らす`,
    increase: (setting) => `${setting}を増やす`,
    settingsNote: '開始済みのフェーズは長さが変わらず、変更は次のフェーズから適用されます。',
    helpTitle: 'メガネでの操作',
    helpGestures: [
      ['タップ', '開始・一時停止'],
      ['タップ後に長押し', 'メニュー：スキップ、リセット'],
      ['スワイプ', 'ジェスチャーを表示'],
      ['ダブルタップ', '終了'],
    ],
    helpAlert: 'メガネは音を鳴らせないため、フェーズが終わるとステータス行が点滅し、次のフェーズを開始するまでタイマーが超過時間をカウントします。',
    preview: 'ブラウザでのプレビュー：メガネは接続されていません。',
  },
};

const ko: Strings = {
  glasses: {
    work: '작업',
    shortBreak: '짧은 휴식',
    longBreak: '긴 휴식',
    alertWork: '다시 작업할 시간!',
    alertBreak: '휴식 시간!',
    alertLongBreak: '긴 휴식 시간!',
    endsAt: (time) => `${time}에 종료`,
    tapToStart: '탭하여 시작 · 탭 + 길게 누르기: 메뉴',
    tapToResume: '탭하여 재개 · 탭 + 길게 누르기: 메뉴',
    tapToStartNext: (duration) => `탭하여 시작 · ${duration}`,
    gestureHint: '탭: 시작/일시정지 · 탭 + 길게 누르기: 메뉴',
    menuSkip: '건너뛰기',
    menuReset: '초기화',
  },
  phone: {
    title: 'Pomodoro',
    work: '작업',
    shortBreak: '짧은 휴식',
    longBreak: '긴 휴식',
    ready: '준비됨',
    running: '진행 중',
    paused: '일시정지됨',
    endsAt: (time) => `${time}에 종료`,
    sessions: (done, total) => `${total}회 중 ${done}회 완료`,
    start: '시작',
    pause: '일시정지',
    resume: '재개',
    skip: '건너뛰기',
    reset: '초기화',
    progressLabel: '단계 진행률',
    settingsTitle: '타이머',
    workLength: '작업',
    shortBreakLength: '짧은 휴식',
    longBreakLength: '긴 휴식',
    sessionsPerSet: '긴 휴식 전 세션 수',
    minutes: (n) => `${n}분`,
    decrease: (setting) => `${setting} 줄이기`,
    increase: (setting) => `${setting} 늘리기`,
    settingsNote: '이미 시작한 단계는 길이가 유지되며, 변경 사항은 다음 단계부터 적용됩니다.',
    helpTitle: '안경에서',
    helpGestures: [
      ['탭', '시작 또는 일시정지'],
      ['탭한 후 길게 누르기', '메뉴: 건너뛰기, 초기화'],
      ['스와이프', '제스처 보기'],
      ['두 번 탭', '종료'],
    ],
    helpAlert: '안경은 소리를 낼 수 없어서, 단계가 끝나면 상태 줄이 깜박이고 다음 단계를 시작할 때까지 타이머가 초과 시간을 셉니다.',
    preview: '브라우저 미리보기: 안경이 연결되지 않았습니다.',
  },
};

export const STRINGS: Record<Lang, Strings> = { en, es, fr, de, it, zh, ja, ko };

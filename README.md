# SkillSprint · AI-собеседование

Модуль интервью для SkillSprint на Vue 3, TypeScript и Vite+. Демо включает три вопроса и локальный разбор ответов. Состояние хранится в рамках одного подключения.

## Запуск и проверки

```sh
npm ci
npm run dev
```

Страница демо доступна по адресу `http://localhost:5173`.

```sh
npm run check       # формат, линтеры, типы, тесты и покрытие
npm run build:prod  # dist/index.js
npm run verify      # проверки, сборка и загрузка через SystemJS, как в CI
```

После сборки можно открыть `http://localhost:5173/tests/browser/` на dev-сервере и проверить жизненный цикл исходного и собранного модуля.

## Подключение к SkillSprint

Из каталога интервью соберите и раздайте готовый файл на порту 5173:

```sh
npm run build:prod
npm run preview
```

Из каталога корня SkillSprint запустите оболочку:

```sh
INTERVIEW_URL=http://localhost:5173/index.js npm start
```

После входа откройте `http://localhost:8099/skillsprint/interview`. Локальная раздача разрешает CORS для `http://localhost:8099` и `http://127.0.0.1:8099`.

Корень загружает `dist/index.js` в формате `System.register` при открытии раздела. Модуль экспортирует `contractVersion = 1` и `mount(element, context)` по контракту `@skillsprint/contracts`. При уходе корень вызывает возвращённый `unmount()`, который отключает Vue и очищает DOM и стили Goober в контейнере.

Публикуйте каталог `dist/` отдельно от корня, сохраняя структуру файлов. Текущая сборка включает Vue, стили и шрифты в `index.js`. Укажите URL опубликованного входного файла в `skillsprint.module.interview`. Для другого origin настройте CORS на статическом хосте и разрешите загрузку в CSP оболочки.

Контракты API описаны в [документации бэкенда](docs/backend.md) и [API активности](docs/activity-api.md).

# Фронтенд `@checkout/web`

Vite + React + TypeScript. API по умолчанию — `http://127.0.0.1:4000`. Авторизация только заголовком `Authorization: Bearer <token>`, без cookies.

## Команды

Из корня репозитория, после `npm ci`:

```sh
npm run dev        # API, 127.0.0.1:4000
npm run dev:web    # фронтенд, http://localhost:5173
npm run build:web  # contracts + production-сборка apps/web
```

Если порт API занят, скопируйте корневой `.env.example` в `.env` и задайте `PORT`. Для фронтенда скопируйте `apps/web/.env.example` в `apps/web/.env` и укажите тот же адрес в `VITE_API_URL`.

## Устройство

- `src/http/` — общий слой запросов: подготовка, отправка, разбор ответа, ошибки, опрос.
- `src/api/resources.ts` — описание эндпоинтов поверх клиента.
- `src/domain/` — валидация, доставка, оплата, каталог, деньги.
- `src/persist/` — сессия, ключи идемпотентности, черновик оформления.
- `src/pages/` — каталог, корзина, checkout, оплата, заказ.

Подробности, разбор обработки данных, сценарии и недоработки — в [корневом README](../../README.md).

Условия: [задание](../../docs/ASSIGNMENT.md). API: [интеграция](../../docs/INTEGRATION.md). [Критерии](../../docs/EVALUATION.md).

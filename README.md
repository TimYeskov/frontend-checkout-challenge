# Frontend Checkout Challenge — решение

Фронтенд магазина в `apps/web` (`@checkout/web`): каталог, корзина, оформление заказа и оплата тестовой картой. Бэкенд из репозитория задания **не менялся**.

Условия: [ASSIGNMENT](docs/ASSIGNMENT.md) · [INTEGRATION](docs/INTEGRATION.md) · [EVALUATION](docs/EVALUATION.md)

Связанное решение (канвас): https://github.com/TimYeskov/frontend-canvas-challenge

## Запуск и сборка фронтенда

Node.js 24.x, npm 11.x.

```sh
git clone https://github.com/TimYeskov/frontend-checkout-challenge.git
cd frontend-checkout-challenge
npm ci
```

Два терминала:

```sh
npm run dev        # API → http://127.0.0.1:4000
npm run dev:web    # фронтенд → http://localhost:5173
```

Сборка фронтенда:

```sh
npm run build:web
```

Если API на другом порту: скопируйте `apps/web/.env.example` → `apps/web/.env` и задайте `VITE_API_URL`.

Swagger: http://localhost:4000/docs/

## Как устроен фронтенд

### HTTP

В компонентах нет `fetch` / `response.ok` / `response.json()`. Всё через `apps/web/src/http/`:

- `prepare` — URL, JSON, `Authorization`, `Idempotency-Key`
- `transport` — один `fetch`
- `parse` — статус, envelope `data`, `Retry-After`, единый `AppError`
- `poll` — опрос оплаты с abort

Операции API — в `apps/web/src/api/resources.ts`. UI получает данные или уже разобранную ошибку (`userMessage`).

### Данные

Частый участок: `domain/catalog.ts` + `ShopContext`.

- Вызов: после загрузки каталога/корзины и при смене количества.
- По одному проходу в `Map` по id; строки каталога/корзины — ещё по одному проходу в плотный `new Array(n)`.
- Без `.map().filter()` и без `.find` по id внутри карточек.

## Проверенные сценарии

- Каталог с API; товар без остатка недоступен; количество в серверной корзине.
- Пустая корзина; прямой заход на `/checkout` без товаров.
- Контакты; самовывоз и курьер; суммы только с сервера.
- Наличные → успех «оплата при получении».
- Карта по маске; ожидание; успех только по статусу заказа с API.
- Отказ `•••• 0002` и отмена различимы; «Оплатить снова» с новым Idempotency-Key.
- Двойной клик оформления/оплаты не создаёт дублей.
- Перезагрузка: сессия, корзина, черновик; незавершённая оплата догоняется опросом.
- Конфликт версии корзины / сеть: форма сохраняется, можно повторить.
- Ширина 1280 px: поля и кнопки доступны с клавиатуры.

## Недоработки

- Короткая вспышка пустой корзины до ответа API при жёсткой перезагрузке.
- `QUOTE_EXPIRED` в коде есть, отдельно с истечением 10 минут в UI не гонялся.
- Мобильная вёрстка и деплой не делались (не требовались).

## Бэкенд (без изменений)

```sh
npm run check
npm run smoke   # при уже запущенном API
npm run data:reset
```

API по умолчанию: `127.0.0.1:4000`. Данные: `.data/store.json`.

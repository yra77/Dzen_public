# SPA-застосунок «Коментарі»

**Тестове завдання Middle-рівня**  
Повністю відповідає оригінальному ТЗ + вимогам Junior+ та Middle (GraphQL, RabbitMQ, Elasticsearch).

## 📋 Опис проекту

Сучасне Single Page Application для публікації та каскадного відображення коментарів.  
Користувачі можуть залишати коментарі з вкладеними відповідями, додавати зображення та TXT-файли, використовувати форматування, CAPTCHA та отримувати оновлення в реальному часі.

**Всі вимоги оригінального ТЗ виконані на 100%**, плюс розширені можливості рівня Middle.

## ✨ Основні функції

- ✅ Реєстрація коментарів з полями: User Name, E-mail, Home Page, CAPTCHA, Text
- ✅ Додавання зображень (автоматичний ресайз до 320×240) та TXT-файлів (≤ 100 KB)
- ✅ Каскадне (nested) відображення відповідей будь-якої глибини
- ✅ Таблиця заголовних коментарів з сортуванням (User Name, E-mail, Дата) + LIFO за замовчуванням
- ✅ Пагінація 25 коментарів на сторінку
- ✅ Попередній перегляд повідомлення без перезавантаження
- ✅ Панель швидкого форматування ([i], [strong], [code], [a])
- ✅ Перегляд файлів у Lightbox
- ✅ Реал-тайм оновлення нових коментарів (SignalR)
- ✅ Захист від XSS та SQL-ін’єкцій
- ✅ Повнотекстовий пошук через Elasticsearch
- ✅ Асинхронна обробка через RabbitMQ

## 🛠 Технологічний стек

### Backend
- ASP.NET Core 8.0 (LTS)
- Entity Framework Core + MS SQL Server
- GraphQL (HotChocolate)
- CQRS + MediatR
- RabbitMQ (MassTransit)
- Elasticsearch (NEST)
- SignalR
- Clean Architecture + SOLID

### Frontend
- Angular (standalone components)
- Apollo Client (GraphQL)
- RxJS
- TailwindCSS + custom CSS

### Інфраструктура
- Docker + Docker Compose
- Redis (кеш, опціонально)


## 🚀 Швидкий запуск (рекомендовано)

### 1. Клонувати репозиторій
  git clone https://github.com/yourusername/comments-spa.git
  cd comments-spa

### 2. Запустити всі сервіси
  docker-compose up -d

### 3. Зачекати 30–40 секунд (перше підняття БД + Elasticsearch)

### 4. Відкрити додаток
 Frontend: http://localhost:4200
 GraphQL Playground: http://localhost:5000/graphql
 RabbitMQ Management: http://localhost:15672 (guest / guest)
 Elasticsearch: http://localhost:9200
 
 
📁 Структура проекту
 comments-spa/
├── src/
│   ├── Comments.Api/           # ASP.NET Core + GraphQL + SignalR
│   ├── Comments.Application/    # CQRS, MediatR, Validators
│   ├── Comments.Domain/         # Entities, Domain Events
│   ├── Comments.Infrastructure/ # EF Core, RabbitMQ, Elasticsearch
│   └── Comments.Web/            # Angular SPA
├── docker-compose.yml
├── README.md
├── db-schema.mwb               # Схема БД (MySQL Workbench)
└── load-test/                  # k6 скрипти для навантажувального тесту


🔧 Ручний запуск (для розробки)

docker-compose up -d mssql rabbitmq elasticsearch
Запустити backend: dotnet run --project src/Comments.Api
Запустити frontend: cd src/Comments.Web && ng serve

📊 Схема БД
Файл db-schema.mwb у корені репозиторію (відкривається в MySQL Workbench).
Можна також переглянути через EF Core Migrations.
📹 Демо-відео
(Додати посилання на відео після запису)
🧪 Навантажувальне тестування
Скрипти в папці load-test/ (k6).
Тест: 100 000 користувачів / 1 000 000 повідомлень за 24 години.
✅ Самоперевірка перед здачею

docker-compose up -d → все працює
 Додавання коментаря з файлами та CAPTCHA
 Відповіді на коментарі (каскад)
 Сортування та пагінація
 Реал-тайм оновлення
 GraphQL запит працює
 RabbitMQ та Elasticsearch індексуються
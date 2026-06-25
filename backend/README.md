# 🕉️ Darshan Backend - SGVD Platform

> **Spiritual Activities & Locations API** - FastAPI-based backend for spiritual practice tracking with intelligent location services

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-Private-red.svg)](LICENSE)

---

## 📑 Documentation Navigation

| 📖 Guide | Description | Link |
|----------|-------------|------|
| 🚀 **Quick Start** | Get started in 5 minutes | [See below](#-quick-start) |
| 👨‍💻 **Developer Setup** | Complete development environment setup | [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md) |
| 🌍 **Locations API** | Location management and sun times | [LOCATIONS_API_GUIDE.md](LOCATIONS_API_GUIDE.md) |
| 🧘 **Spiritual Activities** | Activity tracking system guide | [SPIRITUAL_ACTIVITY_GUIDE.md](SPIRITUAL_ACTIVITY_GUIDE.md) |
| 🔐 **Google OAuth** | Google authentication integration | [GOOGLE_OAUTH_GUIDE.md](GOOGLE_OAUTH_GUIDE.md) |
| 🚢 **Deployment** | Deploy to production (Render) | [RENDER_DEPLOYMENT.md](#deployment) |

---

## ✨ Features

### 🧘‍♂️ Spiritual Activity Tracking
- **Daily Aggregation**: Track japa, pranayama, darshan with automatic daily rollup
- **Smart Limits**: Darshan limited to 1 per day (realistic tracking)
- **History & Analytics**: Complete audit trail and statistical analysis
- **Admin Dashboard**: View all users' spiritual activities with filtering

### 🌍 Location Services
- **Sun Times Calculation**: Automatic sunrise/sunset based on coordinates
- **Multi-Location Support**: Manage spiritual locations worldwide
- **Time-Aware**: Calculations based on user's local time

### 🔐 Authentication & Security
- **JWT-based Authentication**: Secure token-based access
- **Role-Based Access**: Admin and user roles
- **Google OAuth**: Sign in with Google (optional)
- **Password Hashing**: Industry-standard bcrypt hashing

### 📊 Admin Features
- **User Management**: View and manage all users
- **Activity Reports**: Filter and sort spiritual statistics
- **Event Management**: Create and publish spiritual events
- **Bulk Operations**: Efficient multi-record handling

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Git

### 1️⃣ Clone Repository
```bash
git clone https://github.com/ganeshdatta23/SGVD-Backend.git
cd SGVD-Backend
```

### 2️⃣ Set Up Environment
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials
```

### 3️⃣ Set Up Database
```bash
# Create database
createdb darshan

# Run setup script
psql -d darshan -f setup_local_db.sql
```

### 4️⃣ Run Application
```bash
uvicorn app.main:app --reload
```

### 5️⃣ Access Application
- **API Documentation**: http://127.0.0.1:8000/docs
- **Health Check**: http://127.0.0.1:8000/health
- **Admin Login**: admin@darshan.com / admin123
- **User Login**: user@darshan.com / user123

---

## 🏗️ Project Structure

```
SGVD-Backend/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── locations.py       # Location endpoints
│   │   ├── spiritual.py       # Spiritual activity endpoints
│   │   ├── admin_spiritual.py # Admin spiritual stats
│   │   ├── events.py          # Event management
│   │   └── ...
│   ├── models/                 # SQLAlchemy database models
│   │   ├── user.py
│   │   ├── location.py
│   │   ├── spiritual_activity.py
│   │   └── ...
│   ├── schemas/                # Pydantic request/response models
│   ├── services/               # Business logic layer
│   │   ├── spiritual_service.py
│   │   ├── location_service.py
│   │   └── ...
│   ├── utils/                  # Utility functions
│   ├── config.py               # Configuration management
│   ├── database.py             # Database connection
│   └── main.py                 # Application entry point
├── migrations/                 # Database migrations
├── docs/                       # Documentation
├── requirements.txt            # Python dependencies
├── render.yaml                 # Render deployment config
└── .env.example                # Environment template
```

---

## 🔌 API Endpoints

### Authentication
- `POST /sgvd/auth/login` - Login with email/password
- `POST /sgvd/auth/register` - Register new user
- `POST /sgvd/auth/google` - Google OAuth login

### Spiritual Activities (User)
- `POST /sgvd/spiritual/japa` - Log japa (chanting)
- `POST /sgvd/spiritual/pranayama` - Log pranayama (breathing)
- `POST /sgvd/spiritual/darshan` - Log darshan (temple visit)
- `GET /sgvd/spiritual/stats` - Get user statistics
- `GET /sgvd/spiritual/stats/today` - Get today's stats

### Admin - Spiritual Stats
- `GET /sgvd/admin/spiritual-stats` - All users' stats (with filters)
- `GET /sgvd/admin/spiritual-stats/{user_id}` - User detail

### Locations
- `GET /sgvd/locations` - Get all locations with sun times
- `POST /sgvd/locations/update` - Create/update location (Admin)

### Events
- `GET /sgvd/events` - Get published events
- `POST /sgvd/events/bulk` - Create multiple events (Admin)

### Compass
- `GET /sgvd/compass` - Get direction to location

### Users (Admin)
- `GET /sgvd/users` - List all users
- `POST /sgvd/users/bulk-create` - Create multiple users

---

## 🛠️ Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL with asyncpg
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT (python-jose)
- **Password Hashing**: Passlib with bcrypt
- **Validation**: Pydantic v2
- **Sun Calculations**: Astral
- **CORS**: FastAPI middleware
- **Server**: Uvicorn

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_spiritual.py
```

---

## 🚢 Deployment

This application is configured for deployment on **Render**. See deployment guides:

- **Quick Deploy**: Follow the 6-step process in [Quick Deployment Checklist](docs/quick_deploy_checklist.md)
- **Full Guide**: Complete deployment documentation in [Render Deployment Guide](docs/render_deployment_guide.md)

### Production Configuration

The app uses the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT secret key (generate with `secrets.token_urlsafe(32)`) |
| `ADMIN_EMAIL` | ✅ | Default admin email |
| `ADMIN_PASSWORD` | ✅ | Default admin password |
| `ALGORITHM` | ❌ | JWT algorithm (default: HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | Token expiry (default: 1440) |
| `environment` | ❌ | Environment name (development/production) |
| `debug` | ❌ | Debug mode (default: False) |

---

## 📝 Database Schema

### Key Tables
- **users** - User accounts and authentication
- **locations** - Spiritual locations with coordinates
- **spiritual_activity** - Daily aggregated activity records
- **spiritual_activity_history** - Complete audit trail
- **events** - Spiritual events and announcements

### Views
- **user_spiritual_stats** - Aggregated user statistics for admin queries

---

## 🔒 Security Best Practices

- ✅ JWT token authentication
- ✅ Password hashing with bcrypt
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configured for production
- ✅ Environment variables for secrets
- ✅ Role-based access control
- ⚠️ **Remember to change default admin credentials in production!**

---

## 🤝 Contributing

This is a private repository. Contact the project administrator for contribution guidelines.

---

## 📄 License

This project is proprietary and confidential. See [LICENSE](LICENSE) for details.

**Copyright © 2025 SGVD Platform. All rights reserved.**

---

## 📞 Support

For issues, questions, or feature requests, please contact the development team.

---

## 🙏 Acknowledgments

Built with dedication for spiritual practice tracking and community engagement.

---

**Made with ❤️ for the SGVD Community**

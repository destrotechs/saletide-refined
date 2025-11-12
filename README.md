# SaleTide - Automotive Services Management System

A comprehensive, full-stack automotive services management system built with Django REST Framework and Next.js. SaleTide streamlines operations for automotive service centers, from customer management to financial reporting.

![SaleTide Logo](images/saletidelogo.png)

## 🚀 Features

### Customer & Vehicle Management
- Complete customer database with contact information and history
- Vehicle registration and tracking
- Service history for each vehicle
- Customer communication consent management

### Job Management
- Create and manage service jobs with multiple line items
- Real-time job status tracking (Draft, In Progress, Completed, Invoiced, Paid)
- Employee assignment and commission tracking
- Material/inventory allocation per service
- Job cards and printable receipts

### Inventory Management
- SKU-based inventory system with categories
- Real-time stock level monitoring
- Low stock and out-of-stock alerts
- Cost tracking and stock adjustments
- Automatic inventory deduction on job completion

### Financial Management
- Complete accounting system with chart of accounts
- Profit & Loss statements
- Revenue and expense tracking
- Asset management with depreciation calculations
- Expense approval workflows
- Financial reports and analytics

### Employee Management
- User roles and permissions (Admin, Manager, Sales Agent, Technician)
- Commission calculation and tracking
- Tips management
- Advance payment tracking with automatic recovery
- Employee performance metrics

### Services Catalog
- Service definitions with variants
- Vehicle class-based pricing
- Service-specific materials and labor tracking
- Service statistics and pricing analytics

### Reports & Analytics
- Dashboard with KPIs and revenue metrics
- Sales trends and performance charts
- Customer analytics
- Service popularity reports
- Financial summaries
- Exportable reports (PDF, CSV)

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 5.0+ with Django REST Framework
- **Database**: PostgreSQL (production) / SQLite (development)
- **Task Queue**: Celery with Redis
- **Authentication**: JWT (JSON Web Tokens)
- **API Documentation**: OpenAPI/Swagger

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## 📋 Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ (for production)
- Redis (for Celery tasks)

## 🔧 Installation

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/destrotechs/saletide-refined.git
cd saletide-refined
```

2. **Create and activate virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
Create a `.env` file in the root directory:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost:5432/saletide_db
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

5. **Run migrations**
```bash
python manage.py migrate
```

6. **Create superuser**
```bash
python manage.py createsuperuser
```

7. **Load initial data** (optional)
```bash
python manage.py setup_chart_of_accounts
python manage.py setup_asset_categories
python manage.py populate_services
```

8. **Start the development server**
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd timax-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_COMPANY_NAME=SaleTide
NEXT_PUBLIC_COMPANY_TAGLINE=Professional Automotive Services
```

4. **Start the development server**
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Start Celery (Optional - for background tasks)

```bash
# Start Celery worker
celery -A timax_backend worker -l info

# Start Celery beat (for scheduled tasks)
celery -A timax_backend beat -l info
```

## 📁 Project Structure

```
saletide-refined/
├── accounting/          # Accounting & finance module
├── analytics/           # Analytics and insights
├── assets/             # Asset management
├── audit/              # Audit logging
├── authentication/     # User authentication
├── dashboard/          # Dashboard APIs
├── expenses/           # Expense management
├── inventory/          # Inventory management
├── reports/            # Reporting module
├── sales/              # Sales, jobs, customers, vehicles
├── services/           # Services catalog
├── timax_backend/      # Django settings and configuration
├── timax-frontend/     # Next.js frontend application
│   ├── public/         # Static assets
│   ├── src/
│   │   ├── app/        # Next.js pages (App Router)
│   │   ├── components/ # Reusable React components
│   │   ├── contexts/   # React contexts (Auth)
│   │   └── lib/        # Utilities and API client
│   └── package.json
├── manage.py
├── requirements.txt
└── README.md
```

## 🎨 Key Features Showcase

### Responsive PageHeader Component
All pages feature a consistent, responsive header with:
- Breadcrumb navigation
- Page titles and descriptions
- Action buttons optimized for mobile
- White background with subtle borders

### Role-Based Access Control
- **Admin**: Full system access
- **Manager**: Operations and reports management
- **Sales Agent**: Customer and job management
- **Technician**: Job execution and updates

### Commission System
- Automatic commission calculation based on job values
- Configurable commission rates per employee
- Tips tracking and management
- Advance payment with automatic recovery from commissions

## 🔐 Default Credentials

After creating a superuser, you can access:
- **Backend Admin**: http://localhost:8000/admin
- **Frontend**: http://localhost:3000

Use the credentials you created during the superuser setup.

## 📝 API Documentation

API documentation is available at:
- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`

## 🧪 Testing

### Backend Tests
```bash
python manage.py test
```

### Frontend Tests
```bash
cd timax-frontend
npm test
```

## 🚢 Deployment

### Backend (Django)
1. Set `DEBUG=False` in production
2. Configure proper database (PostgreSQL recommended)
3. Set up static files serving
4. Use a production WSGI server (Gunicorn, uWSGI)
5. Set up Redis for Celery
6. Configure proper `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`

### Frontend (Next.js)
1. Build the production bundle:
```bash
npm run build
```

2. Deploy to Vercel, Netlify, or any Node.js hosting platform

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **SaleTide Team** - Initial work

## 🙏 Acknowledgments

- Built with Django REST Framework
- Frontend powered by Next.js 14
- UI components inspired by modern design systems
- Icons from Heroicons

## 📞 Support

For support, email support@saletide.com or open an issue in the GitHub repository.

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Online booking system
- [ ] Integration with payment gateways
- [ ] Multi-location support
- [ ] Advanced analytics and AI insights
- [ ] Customer portal

---

**SaleTide** - Streamlining automotive service management, one job at a time.

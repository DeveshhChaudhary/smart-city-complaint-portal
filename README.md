# 🏙️ Smart City Complaint Portal

A web-based civic complaint management system that enables citizens to report public issues, helps municipal administrators manage complaints, and allows workers to resolve them efficiently.

The platform aims to improve transparency, accountability, and citizen participation through complaint tracking, location-based reporting, rewards, and analytics.

## ✨ Features

### 👤 Citizen Portal
- Register and log in securely.
- Submit civic complaints with descriptions, categories, locations, and photos.
- Track complaint status and progress.
- View complaint history and community reports.
- Earn points and badges for civic participation.
- Redeem available rewards.

### 🛠️ Worker Portal
- View assigned complaints and tasks.
- Access complaint details and locations.
- Update task progress and resolution status.
- Submit completion evidence where supported.
- Track assigned and completed work.

### 🛡️ Admin Portal
- Manage citizens, workers, and departments.
- View, assign, and manage complaints.
- Monitor complaint statuses and resolution progress.
- Manage reward catalogs, claims, badges, and points.
- Review civic participation and leaderboard data.
- View analytics and generate complaint reports.
- Export filtered complaint data to CSV and print reports.
- Publish announcements.

### 📸 Complaint Photo Uploads
- Upload complaint photos through the citizen complaint form.
- Store images using Supabase Storage.
- Associate uploaded image URLs with their respective complaints.
- Display category-specific fallback images when a valid photo is unavailable.

### 📊 Analytics & Reporting
- Monitor complaint statistics and resolution rates.
- Analyze complaint categories and status distributions.
- View worker workload information.
- Filter complaint records and export reports.

## 🧰 Technology Stack

**Frontend**
- React
- Vite
- JavaScript
- HTML and CSS

**Backend**
- Python
- FastAPI
- REST API

**Database and Storage**
- Supabase
- PostgreSQL
- Supabase Storage

**Deployment**
- Render
- GitHub

## 🏗️ System Architecture

```text
Citizens / Workers / Administrators
                 |
                 v
          React Frontend
                 |
                 v
          FastAPI Backend
                 |
          +------+------+
          |             |
          v             v
     PostgreSQL    Supabase Storage
     (Supabase)    (Complaint Photos)
```

## 🚀 Live Demo

- **Frontend:** https://smart-city-complaint-portal-frontend.onrender.com
- **Backend:** https://smart-city-complaint-portal-krs3.onrender.com
- **GitHub Repository:** https://github.com/DeveshhChaudhary/smart-city-complaint-portal

*Note: The live demo requires the deployed services and Supabase project to be available.*

## 💻 Run Locally

### Prerequisites

Install the following:
- Git
- Node.js and npm
- Python
- Access to a configured Supabase project

### 1. Clone the Repository

```bash
git clone https://github.com/DeveshhChaudhary/smart-city-complaint-portal.git
cd smart-city-complaint-portal
```

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a Python virtual environment:

**Windows**
```bash
python -m venv venv
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables using the project's environment example or configuration documentation. Set the Supabase URL, appropriate server-side credentials, and authentication secrets.

Start the backend from the backend directory using the project's FastAPI application entry point. For example, if the entry point is `app.main:app`:

```bash
uvicorn app.main:app --reload
```

The local API will generally be available at `http://127.0.0.1:8000`.

API documentation, when enabled, is available at `http://127.0.0.1:8000/docs`.

### 3. Configure the Frontend

Open a separate terminal and navigate to the project:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the frontend API base URL using the environment variable expected by the application. Refer to the existing frontend configuration and environment example.

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal, usually `http://localhost:5173`.

## 🔐 Environment Variables and Security

- Never commit `.env` files, passwords, JWT secrets, or private API credentials.
- Keep Supabase service-role credentials exclusively on the backend.
- Use environment variables for production configuration.
- Configure authentication, database access, and Storage permissions appropriately.
- Do not include real citizen information or private production records in the repository.

## 📁 Project Structure

```text
smart-city-complaint-portal/
├── backend/
│   └── app/
│       ├── routes/
│       │   ├── admin.py
│       │   └── complaints.py
│       └── main.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── admin/
│       │   ├── citizen/
│       │   └── worker/
│       └── utils/
├── .gitignore
└── README.md
```

*The tree above highlights the main application areas; the complete repository may contain additional files and directories.*

## 🎯 Project Objectives

- Simplify civic complaint registration and tracking.
- Improve coordination between citizens, administrators, and municipal workers.
- Increase transparency in complaint resolution.
- Encourage civic participation through points, badges, and rewards.
- Support data-driven decisions using analytics and reports.

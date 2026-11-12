import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { clearTokens } from "../services/storage/authStorage";

function Dashboard({ role }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            THYO Softtech
          </h1>
          <p className="text-sm text-slate-500">
            Human Resource Management System
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <LogOut size={17} />
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ShieldCheck size={26} />
          </div>

          <p className="text-sm font-medium text-indigo-600">
            THYO Softtech HRMS
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Welcome to {role} Dashboard
          </h2>

          <p className="mt-3 text-slate-600">
            You have successfully logged in.
            Your authentication is working.
          </p>

          <div className="mt-8 rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Your assigned role</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {role}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;

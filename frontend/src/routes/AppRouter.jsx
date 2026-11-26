import { BrowserRouter, Routes, Route } from "react-router-dom";

import PayrollPage from "../features/payroll/pages/PayrollPage.jsx";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/payroll/:payrollId" element={<PayrollPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
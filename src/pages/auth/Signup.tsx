import { Navigate, useLocation } from "react-router-dom";

// Signup and login are the same phone + OTP flow now, so /signup just forwards
// to /login while preserving any post-auth redirect target.
export default function Signup() {
  const location = useLocation();
  return <Navigate to="/login" replace state={location.state} />;
}

"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useRef, useState, KeyboardEvent } from "react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import "@/app/signin/signin.css";
import eye from "@/public/eye.svg";
import { useEmail } from "@/context/UserContext"; 
import Navbar2 from "@/components/navbar2";
import Footer2 from "@/components/footer2";
import CookieConsent from "@/components/cookies";


export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forget, setForget] = useState(true);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [passFlag, setPassFlag] = useState(false);
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [load, setLoad] = useState(false);
  const [load2, setLoad2] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [username, setUserName] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });
  const [emailErrors, setEmailErrors] = useState({
    email: "",
  });
  const [newPasswordError, setNewPasswordError] = useState({
    confirmPassword: "",
    nPass: "",
    cnPass: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showPassword3, setShowPassword3] = useState(false);

  const form = useRef<HTMLFormElement>(null);
  const { setEmailContext } = useEmail();
  const router = useRouter(); 

    React.useEffect(() => {
      const checkSession = async () => {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_SERVER}/check-session`,
            { withCredentials: true }
          );
          if (response.data.isAuthenticated) {
            console.log("Authenticated:", response.data);
            const { email } = response.data;
            setEmailContext(email);
            router.push("/dashboard");
          } else {
            console.log("Not authenticated");
          }
        } catch (error) {
          console.error(error);
        }
      };
      checkSession();
    },[]);

  React.useEffect(() => {
    const checkParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const message = params.get("message");
      const capturedEmail = params.get("email");
      console.log("CAPTURED EMIL ID" + capturedEmail);
      if (code) {
        if (parseInt(code) === 0) {
          setLoading2(true);
          setEmailContext(capturedEmail || "");
         
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_SERVER}/getIsNewUser`,
            {
              params: { email: capturedEmail },
            }
          );

          console.log("CAPT" + response.data.code, response.data.isNewUser);

          if (response.data.code == 0 && response.data.isNewUser)
            router.push("/newuser");
          else if (response.data.code == 0 && !response.data.isNewUser)
            router.push("/dashboard");
        } else {
          toast.error(message || "Authentication failed", {
            id: "success3",
          });
        }
      }
    };
    checkParams();
  }, [router, setEmailContext]);

  async function emailDoesntExist() {
    // console.log("debug 2", email);
    try {
      const result = await axios.get(`${process.env.NEXT_PUBLIC_SERVER}/validateEmail`, {
        params: { email: email },
      });
      const code = result.data.code;
      // console.log("Email exist code: ", code);
      return code !== 0;
    } catch (err) {
      // console.log("Error in emailAlreadyExist function");
      return true;
      // console.log("Error triggered");
    }
  }

  const handleLogin = async () => {
    if (await validateForm()) {
      try {
        const result = await axios.post(`${process.env.NEXT_PUBLIC_SERVER}/login`, {
          email,
          password,
        });
        const { code, message } = result.data;
        if (code === 0) {
          toast.success(message, {id: "success5"});
          setLoad(true);
          setEmailContext(email);
          console.log(email);
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_SERVER}/getIsNewUser`,
            {
              params: { email: email },
            }
          );

          if (response.data.code == 0 && response.data.isNewUser)
            router.push("/newuser");
          else if (response.data.code == 0 && !response.data.isNewUser)
            router.push("/dashboard");
          else toast.error("Server Error");
        } else {
          toast.error("Server Error");
        }
      } catch (err) {
        console.error("Error in handleLogin function in Login.tsx");
      }
    } else {
      setTimeout(() => {
        setFormErrors({
          email: "",
          password: "",
        });
      }, 3000);
    }
  };

  const generateOtp = async () => {
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/sentOTP`,
        {
          email: email,
        }
      );
      setGeneratedOtp(result.data.otp);
    } catch (error) {
      // console.log("Error calling http://localhost:3000/sentOTP on login.tsx");
    }
    // console.log("OTP generated");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (/^[0-9]$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const validateForm = async () => {
    const errors = {
      email: "",
      password: "",
    };
    let isValid = true;

    if (!email) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Not a valid email";
      isValid = false;
    } else if (await emailDoesntExist()) {
      errors.email = "Email isn't registered";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, email: "" }));
      }, 3000);
    }
    if (!password) {
      errors.password = "Password is required";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  async function validateEmail() {
    const exist = await emailDoesntExist();
    // console.log("Debug 1", exist);
    const errors = {
      email: "",
    };
    let isValid = true;
    if (!email) {
      errors.email = "Email is required";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, email: "" }));
      }, 3000);
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Not a valid email";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, email: "" }));
      }, 3000);
    } else {
      const exist = await emailDoesntExist();
      // console.log("Debug 1", exist);
      if (exist) {
        errors.email = "Email isn't registered";
        isValid = false;
      }
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, email: "" }));
      }, 3000);
    }
    setEmailErrors(errors);
    return isValid;
  }

  function validateNewPassword() {
    const errors = {
      confirmPassword: "",
      nPass: "",
      cnPass: "",
    };
    let isValid = true;

    if (!newPassword) {
      errors.nPass = "Password is required";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, nPass: "" }));
      }, 5000);
    } else if (
      newPassword.length < 8 ||
      !/[a-zA-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      errors.nPass =
        "Password must be at least 8 characters long and include a letter and a number";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, nPass: "" }));
      }, 5000);
    }

    if (!confirmNewPassword) {
      errors.cnPass = "Password is required";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, cnPass: "" }));
      }, 5000);
    } else if (
      confirmNewPassword.length < 8 ||
      !/[a-zA-Z]/.test(confirmNewPassword) ||
      !/[0-9]/.test(confirmNewPassword)
    ) {
      errors.cnPass =
        "Password must be at least 8 characters long and include a letter and a number";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, cnPass: "" }));
      }, 5000);
    }

    if (newPassword !== confirmNewPassword) {
      errors.confirmPassword = "Password doesn't match";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({
          ...prevErrors,
          confirmPassword: "",
        }));
      }, 5000);
    }
    setNewPasswordError(errors);
    return isValid;
  }

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpVerify = async () => {
    if (otp.includes("")) {
      setOtpError(true);
    } else {
      setOtpError(false);

      if (generatedOtp === otp.join("")) {
        setPassFlag(true);
        setForget(true);
      } else {
        setVerified(true);
        setTimeout(() => {
          setVerified(false);
        }, 3000);
      }
      // console.log("OTP entered:", otp.join(""));
    }
  };

  const handleForgetPass = () => {
    setForget(false);
  };

  async function handleSend() {
    // console.log("Handle send function triggered");
    // console.log(formErrors);

    // console.log("Handle send function triggered");
    const isEmailValid = await validateEmail();
    // console.log("Debug 2", isEmailValid);
    if (await validateEmail()) {
      generateOtp();
      setShowOtp(true);
    } else {
      setTimeout(() => {
        setEmailErrors({
          email: "",
        });
      }, 3000);
    }
  }

  async function resetPassword() {
    if (validateNewPassword()) {
      try {
        const result = await axios.post(`${process.env.NEXT_PUBLIC_SERVER}/resetPassword`, {
          email: email,
          newPassword: confirmNewPassword,
        });
        if (result.data.code === 0) {
          // console.log("Success resetting password");
          toast.success("Password reset successful");
          setLoad2(true);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else toast.error("Error resetting password");
      } catch (err) {
        // console.log("Error resetting password in Login.tsx");
      }
    } else {
      setTimeout(() => {
        setNewPasswordError({
          confirmPassword: "",
          nPass: "",
          cnPass: "",
        });
      }, 3000);
    }
  }
  async function googleOauth() {
    window.location.href = `${process.env.NEXT_PUBLIC_SERVER}/auth/google/signin`;
  }

  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-300 mainStart">
      <Navbar2 />
      <div className="mainContainer pb-40 mt-28 ">
        <div className="card bg-base-100 w-96 shadow-xl cardDiv">
          <Toaster />
          <article className="text-center text-xl text-bold mt-4">
            {" "}
            Login
          </article>
          <div>
            {forget && !passFlag && (
              <label className="input input-bordered flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4 opacity-70"
                >
                  <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                  <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
                </svg>
                <input
                  type="email"
                  className={`grow ${formErrors.email ? "border-red-500" : ""}`}
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            )}
            {formErrors.email && !passFlag && forget && !showOtp && (
              <p className="alertText text-red-500">{formErrors.email}</p>
            )}
          </div>

          <div>
            {forget && !passFlag && (
              <label className="input input-bordered flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4 opacity-70"
                >
                  <path
                    fillRule="evenodd"
                    d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`grow ${
                    formErrors.password ? "border-red-500" : ""
                  }`}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="btn btn-ghost showBtn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Image
                    src={eye}
                    alt="eye-twotone"
                    className="showIcon"
                    width={10}
                    height={10}
                  />
                </button>
              </label>
            )}
            {formErrors.password && !passFlag && (
              <p className="alertText text-red-500">{formErrors.password}</p>
            )}
          </div>

          {forget && !passFlag && (
            <a
              className="link link-primary forgetLink"
              onClick={handleForgetPass}
            >
              Forget Password
            </a>
          )}

          {forget && !passFlag && (
            <button className="btn btn-primary btnSubmit" onClick={handleLogin}>
              Login
            </button>
          )}
          {forget && !passFlag && (
            
            <button
              className="btn btn-outline btn-primary whiteText"
              onClick={googleOauth}
            >

              {loading2 ? (
              <span className="loading loading-dots loading-md"></span>
              ) : (
                <>
              
              Continue with{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 128 128"
              >
                <path
                  fill="#fff"
                  d="M44.59 4.21a63.28 63.28 0 004.33 120.9 67.6 67.6 0 0032.36.35 57.13 57.13 0 0025.9-13.46 57.44 57.44 0 0016-26.26 74.33 74.33 0 001.61-33.58H65.27v24.69h34.47a29.72 29.72 0 01-12.66 19.52 36.16 36.16 0 01-13.93 5.5 41.29 41.29 0 01-15.1 0A37.16 37.16 0 0144 95.74a39.3 39.3 0 01-14.5-19.42 38.31 38.31 0 010-24.63 39.25 39.25 0 019.18-14.91A37.17 37.17 0 0176.13 27a34.28 34.28 0 0113.64 8q5.83-5.8 11.64-11.63c2-2.09 4.18-4.08 6.15-6.22A61.22 61.22 0 0087.2 4.59a64 64 0 00-42.61-.38z"
                />
                <path
                  fill="#e33629"
                  d="M44.59 4.21a64 64 0 0142.61.37 61.22 61.22 0 0120.35 12.62c-2 2.14-4.11 4.14-6.15 6.22Q95.58 29.23 89.77 35a34.28 34.28 0 00-13.64-8 37.17 37.17 0 00-37.46 9.74 39.25 39.25 0 00-9.18 14.91L8.76 35.6A63.53 63.53 0 0144.59 4.21z"
                />
                <path
                  fill="#f8bd00"
                  d="M3.26 51.5a62.93 62.93 0 015.5-15.9l20.73 16.09a38.31 38.31 0 000 24.63q-10.36 8-20.73 16.08a63.33 63.33 0 01-5.5-40.9z"
                />
                <path
                  fill="#587dbd"
                  d="M65.27 52.15h59.52a74.33 74.33 0 01-1.61 33.58 57.44 57.44 0 01-16 26.26c-6.69-5.22-13.41-10.4-20.1-15.62a29.72 29.72 0 0012.66-19.54H65.27c-.01-8.22 0-16.45 0-24.68z"
                />
                <path
                  fill="#319f43"
                  d="M8.75 92.4q10.37-8 20.73-16.08A39.3 39.3 0 0044 95.74a37.16 37.16 0 0014.08 6.08 41.29 41.29 0 0015.1 0 36.16 36.16 0 0013.93-5.5c6.69 5.22 13.41 10.4 20.1 15.62a57.13 57.13 0 01-25.9 13.47 67.6 67.6 0 01-32.36-.35 63 63 0 01-23-11.59A63.73 63.73 0 018.75 92.4z"
                />
              </svg>
              </> )}
            </button>
          )}

          {!forget && (
            <label className="input input-bordered flex items-center gap-2 resetEmail">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 opacity-70"
              >
                <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
              </svg>
              <input
                type="email"
                className={`grow ${emailErrors.email ? "border-red-500" : ""}`}
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button
                className="btn btn-active btn-primary otpBtn"
                onClick={handleSend}
              >
                Send
              </button>
            </label>
          )}
          {emailErrors.email && !forget && (
            <p className="custoText text-red-500">{emailErrors.email}</p>
          )}

          {!forget && showOtp && (
            <div id="otpSection">
              <p>Please enter the 6-digit OTP sent to your email</p>
              <div className="otpBox">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    value={digit}
                    className={`otpInput w-12 h-12 ${
                      otpError && !digit ? "border-red-500" : ""
                    }`}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                  />
                ))}
              </div>

              {verified && (
                <p className="alertText text-red-500 customAlertLogin">
                  {" "}
                  Wrong OTP
                </p>
              )}

              {!forget && (
                <div className="verifyBtn">
                  <button
                    className="btn btn-active btn-primary"
                    onClick={handleOtpVerify}
                  >
                    Verify
                  </button>
                </div>
              )}
            </div>
          )}

          {passFlag && (
            <div className="resetDiv">
              <label className="input input-bordered flex items-center gap-2 resetBox">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4 opacity-70"
                >
                  <path
                    fillRule="evenodd"
                    d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  type={showPassword2 ? "text" : "password"}
                  className={`grow ${
                    formErrors.password ? "border-red-500" : ""
                  }`}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <button
                  className="btn btn-ghost showBtn"
                  onClick={() => setShowPassword2(!showPassword2)}
                >
                  <Image
                    src={eye}
                    alt="eye-twotone"
                    className="showIcon"
                    width={10}
                    height={10}
                  />
                </button>
              </label>

              {newPasswordError.nPass && (
                <p className="newPassText text-red-500">
                  {newPasswordError.nPass}
                </p>
              )}

              <label className="input input-bordered flex items-center gap-2 resetBox">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4 opacity-70"
                >
                  <path
                    fillRule="evenodd"
                    d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  type={showPassword3 ? "text" : "password"}
                  className={`grow ${
                    formErrors.password ? "border-red-500" : ""
                  }`}
                  placeholder="Confirm New Password"
                  value={confirmNewPassword}
                  onChange={(event) =>
                    setConfirmNewPassword(event.target.value)
                  }
                />
                <button
                  className="btn btn-ghost showBtn"
                  onClick={() => setShowPassword3(!showPassword3)}
                >
                  <Image
                    src={eye}
                    alt="eye-twotone"
                    className="showIcon"
                    width={10}
                    height={10}
                  />
                </button>
              </label>

              {newPasswordError.cnPass && (
                <p className="newPassText text-red-500">
                  {newPasswordError.cnPass}
                </p>
              )}

              {newPasswordError.confirmPassword && (
                <p className="newPassText text-red-500">
                  {newPasswordError.confirmPassword}
                </p>
              )}

              <button
                className="btn btn-outline btn-primary resetBtn"
                onClick={resetPassword}
              >
                Set Password
              </button>
            </div>
          )}

          <p>
            {" "}
            Dont have an account?{" "}
            <Link href="/signup" className="links">
              Sign up
            </Link>
          </p>
          {load && (
            <span className="loading loading-spinner text-primary Load1"></span>
          )}

          {load2 && (
            <span className="loading loading-spinner text-primary Load1"></span>
          )}
        </div>
      </div>
      <Footer2 />
      <CookieConsent />
    </div>
  );
}

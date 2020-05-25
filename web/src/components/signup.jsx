import React from "react";
import API from "../API";

let emailInput = React.createRef();
let passwordInput = React.createRef();
let passwordCheckInput = React.createRef();
let companyCodeInput = React.createRef();

function Signup(props) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    let id = emailInput.current.value;
    let pw = passwordInput.current.value;
    let pwcheck = passwordCheckInput.current.value;
    let companyCode = companyCodeInput.current.value;

    if (pw === pwcheck) {
      await API.addCustomer(id, pw, companyCode).then((data) => {
        if (data.data.message) {
          alert(data.data.message + "회원가입 완료!");
        } else {
          alert("회원가입 실패!!!!!");
        }
      });
    } else {
      alert("패스워드가 일치하지 않습니다.");
    }
  };

  return (
    <div className="signup">
      <form onSubmit={(e) => handleSubmit(e)} action="" className="signup-form">
        <h1>회원가입 페이지</h1>
        Email
        <input
          type="email"
          name="email"
          id="signup-email"
          placeholder="ID@example.com"
          required
          ref={emailInput}
        />
        <br />
        PW
        <input
          type="password"
          name="password"
          id="signup-password"
          placeholder="영문, 숫자, 특수문자 조합 8~20자"
          required
          ref={passwordInput}
        />
        <br />
        PW Check
        <input
          type="password"
          name="password"
          id="signup-password"
          placeholder="비밀번호를 한번 더 입력해주세요."
          required
          ref={passwordCheckInput}
        />
        <br />
        업체 코드
        <input
          name="companyCode"
          id="signup-companycode"
          placeholder="업체 코드를 입력해주세요."
          required
          ref={companyCodeInput}
        />
        <br />
        <button type="submit">회원가입</button>
        {/* <button onClick={props.login}>회원가입</button> */}
      </form>
    </div>
  );
}

export default Signup;

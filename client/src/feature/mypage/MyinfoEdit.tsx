import { setIsMyinfoEditModal } from "feature/modal/modalMyinfoEditSlice";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useHistory } from "react-router-dom";
import {
  useEditMutation,
  useChecknicknameMutation,
  MyinfoEditRequest,
} from "services/api";
import type { NicknameRequest } from "services/api";
import DaumPostCode from "react-daum-postcode";
import { toast } from "react-toastify";

function MyinfoEdit() {
  const { push } = useHistory();
  const dispatch = useAppDispatch();
  const outSelect = useRef<any>();
  const myinfo = useAppSelector((state) => state.myinfo.user);
  //api로 보내는 트리거들
  const [checknickname, {}] = useChecknicknameMutation();
  const [edit, { data, isLoading, isSuccess }] = useEditMutation();
  // api로 보낼 데이터 상태들 정리
  const [editValue, setEditValue] = useState<MyinfoEditRequest>({
    data: {
      userInfo: myinfo,
    },
    password: "",
    nickname: "",
    user_address: "",
    longitude: "",
    latitude: "",
  });

  const { password, nickname, user_address } = editValue;
  const [fullAddress, setFullAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  //중복 검사용으로만 사용하는 닉네임데이터 상태
  const [nicknameValue, setNicknameValue] = useState<NicknameRequest>({
    nickname: "",
  });
  // 닉네임 중복 검사후 통과여부 상태
  const [nicknameOverlappingValidity, setNicknameOverlappingValidity] =
    useState(true);
  // Validation (닉네임 중복검사)

  const checkNicknameOverlapping = async () => {
    try {
      const user = await checknickname(nicknameValue).unwrap();
      setNicknameOverlappingValidity(false);
      console.log(user);
      if (user.message === "중복 없음") {
        setNicknameOverlappingValidity(false);
        toast.success("사용가능한 닉네임입니다.");
      } else {
        setNicknameOverlappingValidity(true);
        toast.error("중복된 닉네임입니다.");
      }
    } catch (err) {
      console.log("error", err);
    }
  };

  useEffect(() => {
    // 주소-좌표 변환 객체를 생성합니다
    var geocoder = new window.kakao.maps.services.Geocoder();
    // 주소로 좌표를 검색합니다
    geocoder.addressSearch(`${fullAddress}`, function (result: any) {
      // 정상적으로 검색이 완료됐으면

      /*coords는 맵에 찍기 위한 위도경도 */
      var coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

      /*위도 경도 설정 */
      setLatitude(result[0].y);
      setLongitude(result[0].x);
      handleLatLongEditValue(latitude, longitude);
    });
  }, [fullAddress, latitude]);
  const handleAddressEditValue = (value: string) => {
    setEditValue({ ...editValue, user_address: value });
  };
  const handleLatLongEditValue = (value1: string, value2: string) => {
    setEditValue({ ...editValue, latitude: value1, longitude: value2 });
  };
  /*************카카오 API  핸들러**********/
  const handleComplete = (data: any) => {
    let fullAddress = data.address; // 주소 할당
    let extraAddress = ""; //빌딩의 경우 추가 주소를 받는다.
    if (data.addressType === "R") {
      // R: 도로명 J:지번명 주소로 받겠다.
      if (data.bname !== "") {
        extraAddress += data.bname; //bname : 법정동/법정리 이름 extraAddress에 합치기
      }
      if (data.buildingName !== "") {
        //buildingName: 빌딩 extraAddress에 명합치기
        extraAddress +=
          extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : ""; // fullAddress에 extraAddress합치기
    }
    setFullAddress(fullAddress); //최종 주소를 주소상태에 넣어주기
    handleAddressEditValue(fullAddress);
  };
  //클릭에 따라 Kakao주소창 열고 닫을 상태를 false로 설정
  const [isAddClicked, setIsAddClicked] = useState(false);
  //클릭에 따라 Kakao 주소창 열고 닫히는 함수를 설정
  const handleOpen = () => {
    setIsAddClicked(!isAddClicked);
  };
  //kakao 주소창 CSS스타일 설정
  const modalStyle = {
    zIndex: "100",
    border: "2px solid #000000",
    overflow: "hidden",
  };
  const handleEditInputValue =
    (key: string) => (e: { target: { value: string } }) => {
      setEditValue({ ...editValue, [key]: e.target.value });
      setNicknameValue({ ...nicknameValue, [key]: e.target.value });
    };
  //비밀번호 유효성 검사
  const checkPasswordValidity = (isVal: string) => {
    let regExp = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,30}$/; //최소 8자, 최소 하나의 문자와 숫자
    return regExp.test(isVal);
  };
  //회원가입 버튼을 누를 때 발동되는 handleSignup 함수
  const handleEditMyinfo = () => {
    if (!password && !nickname && !longitude && !user_address && !latitude) {
      return toast.error("항목을 입력해주세요.");
    }
    if (password) {
      //password가 있는데
      if (!checkPasswordValidity(password)) {
        //양식에 안맞다면
        return toast.error(
          "비밀번호는 6자 이상 최소 하나의 숫자와 문자를 포함해야 합니다."
        );
      }
    }
    if (nickname) {
      if (nickname.length === 1 || nickname.length > 15) {
        return toast.error("별명은 2~15자 이내로 입력해 주세요. ");
      } else if (nicknameOverlappingValidity) {
        return toast.error("닉네임 중복여부를 확인해주세요 ");
      }
      // 모든 검증 후 회원가입정보를 서버로 전송요청 함수
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    try {
      console.log(editValue);
      const user = await edit(editValue).unwrap();
      dispatch(setIsMyinfoEditModal());

      // dispatch(setCredentials(user));
      toast.success("성공적으로 회원정보 수정완료");

      console.log(user);
    } catch (err) {
      console.log("error", err);
    }
  };
  const handleOutClick = (e: any) => {
    e.preventDefault();
    if (e.target === outSelect.current) dispatch(setIsMyinfoEditModal());
  };

  return (
    <div
      className="h-screen w-full absolute bg-black bg-opacity-70 text-center"
      ref={outSelect}
      onClick={handleOutClick}
    >
      <div className="bg-white absolute top-1/4 left-1/3 rounded w-10/12 md:w-1/3">
        <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-4">
            <span
              className="absolute top-4 right-6 hover:text-indigo-500 cursor-pointer"
              onClick={() => dispatch(setIsMyinfoEditModal())}
            >
              &times;
            </span>
            <div>
              <img
                className="mx-auto h-12 w-auto"
                src="https://tailwindui.com/img/logos/workflow-mark-indigo-600.svg"
                alt="Workflow"
              />
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                회원정보 수정
              </h2>
            </div>
            <form className="mt-8 space-y-6">
              <input type="hidden" name="remember" value="true" />
              <div className="rounded-md shadow-sm -space-y-px text-left ">
                <div className="mb-3">
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">
                      닉네임
                    </label>
                    <div className="justify-center mt-4 flex">
                      <input
                        type="text"
                        name="nickname"
                        id="nickname"
                        onChange={handleEditInputValue("nickname")}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-cyan-600 focus:border-cyan-600 block w-8/12 p-2.5"
                        placeholder="닉네임"
                      />
                      <button
                        className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
                        onClick={checkNicknameOverlapping}
                      >
                        중복 체크
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      name="password"
                      id="password"
                      onChange={handleEditInputValue("password")}
                      placeholder="••••••••"
                      className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-cyan-600 focus:border-cyan-600 block w-full p-2.5"
                    />
                  </div>
                  <div>
                    {/* <label className="text-sm font-medium text-gray-900 block mb-2">
                주소
              </label> */}

                    <button
                      className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
                      onClick={handleOpen}
                    >
                      주소 찾기
                    </button>
                    {isAddClicked ? (
                      <div>
                        <DaumPostCode
                          onComplete={handleComplete}
                          style={modalStyle}
                        />
                      </div>
                    ) : null}
                    <input
                      type="text"
                      name="address"
                      id="address"
                      value={fullAddress}
                      readOnly
                      className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-cyan-600 focus:border-cyan-600 block w-full p-2.5"
                      placeholder="주소"
                    ></input>
                  </div>
                </div>
              </div>
              <div>
                <button
                  onClick={handleEditMyinfo}
                  /* disabled={!isValidate}  */ type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    {/* <svg className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" xmlns="../images/icons8-google.svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"> */}
                    <svg
                      className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  회원정보 수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyinfoEdit;

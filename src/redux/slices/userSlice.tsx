import {createSlice} from '@reduxjs/toolkit';

export interface UserInfo{
    _id : string;
  name : string;
  email: string;
  role: string;
  status?: string;
}

interface InitialState{
    userInfo : {userData: UserInfo} | null;
}
// Safely get userInfo from localStorage for initial state
const getUserInfoFromStorage = (): {userData: any} | null => {
    try {
        const stored = localStorage.getItem("userInfo");
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validate structure
            if (parsed && parsed.userData) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Error parsing userInfo from localStorage:", e);
    }
    return null;
};

const initialState: InitialState = {
    userInfo: getUserInfoFromStorage(),
}
const authSlice = createSlice({
    name:'userAuth',
    initialState,
    reducers:{

          setUserCredentials: (state, action) => {
            // Validate payload structure
            if (action.payload && action.payload.userData) {
                state.userInfo = action.payload;
                // Update localStorage synchronously
                try {
                    localStorage.setItem("userInfo", JSON.stringify(action.payload));
                } catch (e) {
                    console.error("Error storing userInfo to localStorage:", e);
                }
            } else {
                console.error("Invalid payload structure for setUserCredentials:", action.payload);
            }
          },
          userLogOut: (state) => {
            state.userInfo = null;
            localStorage.removeItem("userInfo")
          },
    }
})

export const {

  setUserCredentials,
  userLogOut
  
} = authSlice.actions

export default authSlice.reducer
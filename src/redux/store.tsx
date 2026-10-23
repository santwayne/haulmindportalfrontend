import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/userSlice';
import superAdminReducer from './slices/superAdminSlice';

export const store = configureStore({
    reducer: {
        userAuth: authReducer,
        superAdminAuth: superAdminReducer,
        // clientAuth: clientReducer,
        // photographerAuth: photographerReducer,
        // editorAuth: editorReducer
    },
    devTools: true
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
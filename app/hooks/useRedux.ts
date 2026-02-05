// Redux typed hooks for better type safety throughout the application
// Replaces plain useDispatch and useSelector with app-specific types

import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "@/app/store";

/**
 * Typed version of useDispatch for this app
 * Use this instead of plain useDispatch to get proper type hints
 * @example
 * const dispatch = useAppDispatch();
 * dispatch(setUser(userData));
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed version of useSelector for this app
 * Use this instead of plain useSelector to get proper type hints
 * @example
 * const user = useAppSelector((state) => state.user.currentUser);
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

import { useCallback, useEffect, useRef, useState } from "react";

export const useStateWithCallback = <T>(
	initialState: T,
): [T, (newState: T | ((state: T) => T), cb: (state: T) => void) => void] => {
	const [state, setState] = useState<T>(initialState);
	const cbRef = useRef<((state: T) => void) | null>(null);

	const updateState = useCallback(
		(newState: T | ((state: T) => T), cb: (state: T) => void) => {
			cbRef.current = cb;
			setState((prev) => {
				if (typeof newState === "function") {
					return (newState as (prevState: T) => T)(prev);
				}

				return newState;
			});
		},
		[],
	);

	useEffect(() => {
		if (cbRef.current) {
			cbRef.current(state);
			cbRef.current = null;
		}
	}, [state]);

	return [state, updateState];
};

export type FirebaseAuthMutationQueue = <T>(operation: () => Promise<T>) => Promise<T>;

/**
 * Firebase custom claims are stored on one user and every custom-token sign-in
 * replaces the browser actor's token. Run those mutations in request order so
 * a slower claim refresh for a previous store cannot overwrite the most recent
 * store selection after it has already been acknowledged by the UI.
 */
export const createFirebaseAuthMutationQueue = (): FirebaseAuthMutationQueue => {
    let tail: Promise<void> = Promise.resolve();

    return <T>(operation: () => Promise<T>): Promise<T> => {
        const result = tail.then(operation, operation);
        tail = result.then(
            () => undefined,
            () => undefined,
        );
        return result;
    };
};

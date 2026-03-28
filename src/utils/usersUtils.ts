export const extractUserDataFromFirebaseUser = (firebaseUser: any) => {
    if (!firebaseUser) return {};
    const user = {
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
        profileImage: firebaseUser.photoURL || firebaseUser.image || "",
        refreshToken: firebaseUser.stsTokenManager.refreshToken || "",
        accessToken: firebaseUser.stsTokenManager.accessToken || ""
    }
    return user;
}
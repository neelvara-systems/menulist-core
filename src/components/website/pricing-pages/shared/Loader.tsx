
function Loader() {
    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black opacity-50 z-50">
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-primary"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
            </div>
        </div>
    )
}

export default Loader
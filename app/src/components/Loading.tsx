


export function Loading() {
    return (
        <div className="flex flex-row gap-2 items-center justify-center py-4">
            <div className="w-4 h-4 rounded-full bg-[#537791] animate-bounce [animation-delay:.7s]"></div>
            <div className="w-4 h-4 rounded-full bg-[#537791] animate-bounce [animation-delay:.3s]"></div>
            <div className="w-4 h-4 rounded-full bg-[#537791] animate-bounce [animation-delay:.7s]"></div>
        </div>
    );
}

export function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6E7' }}>
            <Loading />
        </div>
    );
}

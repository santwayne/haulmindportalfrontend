function Card({
    children,
    className = "",
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={` backdrop-blur-md rounded-xl p-4 border border-theme shadow-md hover:shadow-lg transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-[1.01]" : ""} ${className}`}
        >
            {children}
        </div>
    );
}

export default Card  
function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-main">

      {/* Spinner */}
      <div className="
        w-12 h-12 
        border-4 
        border-[var(--accent-blue)] 
        border-t-transparent 
        rounded-full 
        animate-spin
        shadow-[0_0_20px_var(--accent-blue)]
      " />

      {/* Text */}
      <div className="mt-4 text-sm font-medium text-secondary animate-pulse">
        Loading...
      </div>

    </div>
  );
}

export default Loading;
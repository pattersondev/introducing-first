interface ProbabilityBarProps {
  probability: number;
}

export function ProbabilityBar({ probability }: ProbabilityBarProps) {
  const getBarColor = (prob: number) => {
    if (prob > 0.5) return "bg-green-500";
    if (prob < 0.5) return "bg-red-500";
    return "bg-blue-500";
  };

  return (
    <div className="w-full bg-gray-700 h-2 rounded-full mt-3">
      <div
        className={`${getBarColor(probability)} h-full rounded-full`}
        style={{ width: `${probability * 100}%` }}
      ></div>
    </div>
  );
}

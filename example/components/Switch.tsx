import { useState, useEffect } from "react";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

function Switch({
  checked = false,
  onChange,
  disabled = false,
  className = "",
}: SwitchProps) {
  const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleToggle = () => {
    if (!disabled) {
      const newChecked = !isChecked;
      setIsChecked(newChecked);
      onChange(newChecked);
    }
  };

  return (
    <button
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === " ") handleToggle();
      }}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        ${isChecked ? "bg-sky-500" : "bg-gray-200"}
        ${className}
      `}
    >
      <span
        className={`
          inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-lg transition-transform
          ${isChecked ? "translate-x-5.5" : "translate-x-1"}
        `}
      />
    </button>
  );
}

export default Switch;

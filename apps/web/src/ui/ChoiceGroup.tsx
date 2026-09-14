type Option<T extends string> = { value: T; title: string; description?: string };

type Props<T extends string> = {
  name: string;
  legend: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  error?: string;
};

export function ChoiceGroup<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  error,
}: Props<T>) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      <div className="choice-list">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <label key={option.value} className={`choice${value === option.value ? ' is-on' : ''}`}>
              <input
                type="radio"
                name={name}
                id={id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              <span>
                <strong>{option.title}</strong>
                {option.description ? <em>{option.description}</em> : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

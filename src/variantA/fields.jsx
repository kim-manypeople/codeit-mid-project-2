import { RadioIcon, CheckIcon, ErrorIcon } from './icons.jsx';

// 왈라 폼 클래스를 그대로 옮긴 것
const OPTION_CLASS =
  'font-medium gap-2 w-full rounded-md px-3 py-2 text-md bg-field min-h-12 h-fit flex flex-row justify-between items-center cursor-pointer select-none';
const INPUT_CLASS =
  'flex w-full rounded-md px-3 py-2 text-md bg-field h-12 outline-none border border-transparent focus:border-primary focus:ring-1 focus:ring-primary';

function Label({ field }) {
  return (
    <label id={`field_${field.id}_label`} htmlFor={`field_${field.id}`}>
      <div className="ProseMirror mb-1.5" dangerouslySetInnerHTML={{ __html: field.html }} />
    </label>
  );
}

function StatusLine({ field, error }) {
  if (error) {
    return (
      <div id={`field_${field.id}_error`} role="alert" className="flex flex-row gap-1 items-center">
        <ErrorIcon />
        <p className="text-xs text-destructive">{error.msg}</p>
      </div>
    );
  }
  if (field.required) return <p className="text-primary text-xs">* 필수 입력</p>;
  return null;
}

function RadioField({ field, value, onChange }) {
  return (
    <div role="radiogroup" className="grid gap-2" id={`field_${field.id}`} aria-labelledby={`field_${field.id}_label`}>
      {field.options.map((o) => {
        const checked = value === o.id;
        return (
          <label key={o.id} className={OPTION_CLASS} onClick={() => onChange(o.id)}>
            <span className="text-md font-normal">{o.label}</span>
            <button type="button" role="radio" aria-checked={checked} data-state={checked ? 'checked' : 'unchecked'} className="rounded-full text-primary cursor-pointer" tabIndex={-1}>
              <RadioIcon checked={checked} />
            </button>
          </label>
        );
      })}
    </div>
  );
}

function CheckboxField({ field, value, onToggle }) {
  const selected = value || [];
  return (
    <div role="group" id={`field_${field.id}`} aria-labelledby={`field_${field.id}_label`}>
      <div className="flex flex-col gap-2">
        {field.options.map((o) => {
          const checked = selected.includes(o.id);
          return (
            <label key={o.id} className={OPTION_CLASS} onClick={() => onToggle(o.id)}>
              <span className="text-md font-normal">{o.label}</span>
              <button type="button" role="checkbox" aria-checked={checked} data-state={checked ? 'checked' : 'unchecked'} className="peer rounded-sm cursor-pointer" tabIndex={-1}>
                <CheckIcon checked={checked} />
              </button>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function LinearField({ field, value, onChange }) {
  const nums = [];
  for (let n = field.scale_min; n <= field.scale_max; n++) nums.push(n);
  return (
    <div className="flex flex-col items-center max-w-full w-full shrink-0" role="application" id={`field_${field.id}`}>
      <div className="w-full">
        <div className="flex justify-center gap-1">
          {nums.map((n) => {
            const on = value === n;
            return (
              <button
                key={n}
                type="button"
                role="option"
                aria-selected={on}
                title={String(n)}
                onClick={() => onChange(n)}
                className={
                  'inline-flex items-center justify-center whitespace-nowrap py-2 flex-1 min-w-0 max-w-10 h-10 px-0 rounded-sm font-medium text-sm transition-all duration-150 cursor-pointer ' +
                  (on ? 'bg-primary text-primary-foreground' : 'bg-field text-foreground')
                }
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex flex-row gap-10 w-full justify-between mt-2 text-sm text-foreground/60">
          <div className="flex-1">{field.scale_minLabel}</div>
          <div className="flex-1 text-right">{field.scale_maxLabel}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ field, value, error, onAnswer, onToggle, containerRef }) {
  if (field.type === 'DESCRIPTION') {
    return (
      <div className="flex flex-col" id={`field_container_${field.id}`} ref={containerRef} data-num={field.num}>
        <div className="flex flex-col gap-1">
          <div className="ProseMirror mb-1.5" dangerouslySetInnerHTML={{ __html: field.html }} />
        </div>
      </div>
    );
  }
  let control = null;
  if (field.type === 'RADIO') control = <RadioField field={field} value={value} onChange={onAnswer} />;
  else if (field.type === 'CHECKBOX') control = <CheckboxField field={field} value={value} onToggle={onToggle} />;
  else if (field.type === 'LINEAR') control = <LinearField field={field} value={value} onChange={onAnswer} />;
  else if (field.type === 'NUMBER')
    control = (
      <input
        className={INPUT_CLASS}
        inputMode="numeric"
        maxLength={15}
        placeholder={field.placeholder}
        id={`field_${field.id}`}
        type="text"
        value={value || ''}
        onChange={(e) => onAnswer(e.target.value.replace(/[^0-9]/g, ''))}
      />
    );
  else if (field.type === 'SHORT_TEXT')
    control = (
      <input
        className={INPUT_CLASS}
        placeholder={field.placeholder || '답변을 입력해주세요'}
        maxLength={field.maxLength}
        id={`field_${field.id}`}
        type="text"
        value={value || ''}
        onChange={(e) => onAnswer(e.target.value)}
      />
    );
  else if (field.type === 'LONG_TEXT')
    control = (
      <textarea
        className="flex w-full min-h-[160px] rounded-md text-md bg-field p-3.5 outline-none border border-transparent focus:border-primary"
        id={`field_${field.id}`}
        placeholder={field.placeholder}
        style={{ resize: 'none' }}
        value={value || ''}
        onChange={(e) => onAnswer(e.target.value)}
      />
    );

  return (
    <div className="flex flex-col transition-transform" id={`field_container_${field.id}`} ref={containerRef} data-num={field.num}>
      <div className="flex flex-col gap-1">
        <StatusLine field={field} error={error} />
        <div className="flex flex-col gap-2">
          <Label field={field} />
          {control}
        </div>
      </div>
    </div>
  );
}

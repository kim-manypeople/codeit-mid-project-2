// B안(개선안) 문항 컴포넌트. Figma 「목업 hifi」 값을 그대로 옮겼다.
import { useState } from 'react';

const ICON = '/b/';

// 문항 제목 위 줄: "*필수" 또는 오류 알약
function StatusLine({ field, error }) {
  return (
    <div className="flex h-6 items-end">
      {error ? (
        <div
          id={`field_${field.id}_error`}
          role="alert"
          className="flex h-6 items-center gap-0.5 rounded-[4px] bg-[#fae8e8] px-2 py-1"
        >
          <img src={`${ICON}icon-error.svg`} alt="" width={14} height={14} className="block shrink-0" />
          <p className="text-[14px] leading-[14px] tracking-[-0.14px] text-[#ed4b4b]">{error.node}</p>
        </div>
      ) : field.required ? (
        <p className="font-[Inter_Variable,Inter,sans-serif] text-[12px] leading-4 text-[#007eff]">{field.requiredLabel || '*필수'}</p>
      ) : null}
    </div>
  );
}

// 복수선택 개수 알약 ("3개 선택")
export function countPill(field) {
  if (field.type !== 'CHECKBOX') return null;
  if (field.exact !== undefined) return `${field.exact}개 선택`;
  if (field.min !== undefined && field.min === field.max) return `${field.min}개 선택`;
  if (field.max !== undefined) return `최대 ${field.max}개 선택`;
  return '복수 선택';
}

function Title({ field, no }) {
  const pill = countPill(field);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
      <h3 className="flex min-w-0 text-[20px] font-semibold leading-7 tracking-[-0.2px] text-[#212121]">
        <span className="shrink-0 pl-[6px] pr-[6px]">{no}.</span>
        <span className="min-w-0 break-keep">{field.title}</span>
      </h3>
      {field.description && (
        <p className="w-full pl-[6px] text-[16px] leading-6 tracking-[-0.16px] text-[#6e6e6e] break-keep">{field.description}</p>
      )}
      {pill && (
        <span className="flex shrink-0 items-center justify-center rounded-[4px] border border-[#007eff] p-1 text-[14px] leading-[14px] text-[#007eff]">
          {pill}
        </span>
      )}
    </div>
  );
}

const OPTION =
  'flex min-h-12 w-full items-center gap-2 rounded-[8px] px-3 py-[10px] text-left text-[16px] leading-5 tracking-[-0.16px] select-none cursor-pointer';

function RadioField({ field, value, onChange }) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2" id={`field_${field.id}`}>
      {field.options.map((o) => {
        const on = value === o.id;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={on}
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`${OPTION} ${on ? 'bg-[#eaf2ff]' : 'bg-[#f2f2f2]'} text-[#212121]`}
          >
            <img src={`${ICON}${on ? 'radio-on' : 'radio-off'}.svg`} alt="" width={28} height={28} className="block shrink-0" />
            <span className="min-w-0">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CheckboxField({ field, value, limit, onToggle, onBlocked }) {
  const selected = value || [];
  const full = limit !== undefined && selected.length >= limit;
  return (
    <div role="group" className="flex flex-col gap-2" id={`field_${field.id}`}>
      {field.options.map((o) => {
        const on = selected.includes(o.id);
        const disabled = full && !on;
        return (
          <button
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-disabled={disabled}
            key={o.id}
            onClick={() => (disabled ? onBlocked() : onToggle(o.id))}
            className={`${OPTION} ${
              on ? 'bg-[#eaf2ff] text-[#212121]' : disabled ? 'bg-[#fbfbfb] text-[#a6a6a6]' : 'bg-[#f2f2f2] text-[#212121]'
            }`}
          >
            {on ? (
              <span className="relative block size-6 shrink-0 rounded-[3.429px] bg-[#007eff]">
                <img src={`${ICON}icon-check.svg`} alt="" width={24} height={24} className="absolute inset-0 block" />
              </span>
            ) : (
              <span className="block size-6 shrink-0 rounded-[3.429px] border-[1.714px] border-[#d3d3d3]" />
            )}
            <span className="min-w-0">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LinearField({ field, value, onChange }) {
  const nums = [];
  for (let n = field.scale_min; n <= field.scale_max; n++) nums.push(n);
  return (
    <div id={`field_${field.id}`} className="flex flex-col gap-2">
      <div className="flex gap-2">
        {nums.map((n) => {
          const on = value === n;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={on}
              key={n}
              onClick={() => onChange(n)}
              className={`h-12 flex-1 rounded-[8px] text-[16px] font-medium ${
                on ? 'bg-[#007eff] text-white' : 'bg-[#f2f2f2] text-[#212121]'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[14px] leading-5 text-[#6e6e6e]">
        <span>{field.scale_minLabel}</span>
        <span>{field.scale_maxLabel}</span>
      </div>
    </div>
  );
}

// 글 입력: 기본 / 입력 중(파란 테두리, 위에 안내) / 오류(빨간 테두리)
function TextInput({ field, value, error, onChange, onFocusChange, multiline }) {
  const [focused, setFocused] = useState(false);
  const hint = field.placeholder || '답변을 입력해 주세요';
  const border = error ? 'border-2 border-[#ed4b4b]' : focused ? 'border-2 border-[#007eff]' : 'border-2 border-transparent';
  const common = {
    id: `field_${field.id}`,
    value: value || '',
    placeholder: focused ? '' : hint,
    onFocus: () => {
      setFocused(true);
      onFocusChange(true);
    },
    onBlur: () => {
      setFocused(false);
      onFocusChange(false);
    },
    className: `w-full rounded-[8px] bg-[#f2f2f2] px-[10px] text-[16px] leading-5 tracking-[-0.16px] text-[#212121] outline-none placeholder:text-[#a6a6a6] ${border}`,
  };
  return (
    <div className="flex flex-col gap-0.5">
      <p
        className={`text-[14px] leading-5 tracking-[-0.14px] ${error ? 'text-[#ed4b4b]' : 'text-[#007eff]'} ${
          focused || error ? '' : 'invisible'
        }`}
      >
        {hint}
      </p>
      {multiline ? (
        <textarea {...common} rows={5} style={{ resize: 'none' }} className={`${common.className} py-3`} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'NUMBER' ? (
        <input
          {...common}
          type="text"
          inputMode="numeric"
          maxLength={15}
          className={`${common.className} h-12`}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        />
      ) : (
        <input {...common} type="text" maxLength={field.maxLength} className={`${common.className} h-12`} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function Field({ field, no, value, error, limit, onAnswer, onToggle, onBlocked, onFocusChange, containerRef }) {
  if (field.type === 'DESCRIPTION') {
    return (
      <div ref={containerRef} data-num={field.num} id={`field_container_${field.id}`} className="scroll-mt-[86px]">
        <div className="ProseMirror" dangerouslySetInnerHTML={{ __html: field.html }} />
      </div>
    );
  }
  let control = null;
  if (field.type === 'RADIO') control = <RadioField field={field} value={value} onChange={onAnswer} />;
  else if (field.type === 'CHECKBOX')
    control = <CheckboxField field={field} value={value} limit={limit} onToggle={onToggle} onBlocked={onBlocked} />;
  else if (field.type === 'LINEAR') control = <LinearField field={field} value={value} onChange={onAnswer} />;
  else
    control = (
      <TextInput
        field={field}
        value={value}
        error={error}
        onChange={onAnswer}
        onFocusChange={onFocusChange}
        multiline={field.type === 'LONG_TEXT'}
      />
    );
  return (
    <div ref={containerRef} data-num={field.num} id={`field_container_${field.id}`} className="flex flex-col gap-4 scroll-mt-[86px]">
      <div className="flex flex-col">
        <StatusLine field={field} error={error} />
        <Title field={field} no={no} />
      </div>
      {control}
    </div>
  );
}

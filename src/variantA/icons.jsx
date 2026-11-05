// 왈라 폼과 같은 아이콘 모양
export function RadioIcon({ checked }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="pointer-events-none rounded-full">
      <path
        d="M12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0ZM12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6Z"
        className={checked ? 'text-primary' : 'text-field-foreground'}
        fill="currentColor"
      />
    </svg>
  );
}

export function CheckIcon({ checked }) {
  if (checked) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="pointer-events-none rounded-full">
        <path d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12Z" fill="currentColor" className="text-primary" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M17.7534 8.34248C18.1166 8.75858 18.0737 9.39029 17.6575 9.75344L10.7825 15.7534C10.4058 16.0822 9.84419 16.0822 9.46748 15.7534L6.34248 13.0262C5.92637 12.663 5.88344 12.0313 6.24659 11.6152C6.60974 11.1991 7.24144 11.1562 7.65755 11.5193L10.125 13.6727L16.3425 8.24659C16.7586 7.88344 17.3903 7.92637 17.7534 8.34248Z"
          className="text-background"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="pointer-events-none rounded-full">
      <path
        d="M12 1.84615C6.39219 1.84615 1.84615 6.39219 1.84615 12C1.84615 17.6078 6.39219 22.1538 12 22.1538C17.6078 22.1538 22.1538 17.6078 22.1538 12C22.1538 6.39219 17.6078 1.84615 12 1.84615ZM0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12Z"
        fill="currentColor"
        className="text-field-foreground"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.7534 8.34248C18.1166 8.75858 18.0737 9.39029 17.6575 9.75344L10.7825 15.7534C10.4058 16.0822 9.84419 16.0822 9.46748 15.7534L6.34248 13.0262C5.92637 12.663 5.88344 12.0313 6.24659 11.6152C6.60974 11.1991 7.24144 11.1562 7.65755 11.5193L10.125 13.6727L16.3425 8.24659C16.7586 7.88344 17.3903 7.92637 17.7534 8.34248Z"
        className="text-field-foreground"
        fill="currentColor"
      />
    </svg>
  );
}

export function ErrorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="fill-destructive w-3 h-3">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 11c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1m1 4h-2v-2h2z" />
    </svg>
  );
}

export function ToastErrorIcon() {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none">
      <path
        d="M10 0.5C4.48 0.5 0 4.98 0 10.5C0 16.02 4.48 20.5 10 20.5C15.52 20.5 20 16.02 20 10.5C20 4.98 15.52 0.5 10 0.5ZM10 11.5C9.45 11.5 9 11.05 9 10.5V6.5C9 5.95 9.45 5.5 10 5.5C10.55 5.5 11 5.95 11 6.5V10.5C11 11.05 10.55 11.5 10 11.5ZM11 15.5H9V13.5H11V15.5Z"
        fill="#ED4B4B"
      />
    </svg>
  );
}

export function ChevronIcon({ left }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="fill-primary-foreground" viewBox="0 0 24 24" style={left ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M8.3 17.7c-.3-.3-.45-.67-.45-1.1s.15-.8.45-1.1l3.5-3.5-3.5-3.5c-.3-.3-.45-.67-.45-1.1s.15-.8.45-1.1.67-.45 1.1-.45.8.15 1.1.45l4.6 4.6q.225.225.33.51.12.285.12.6c0 .315-.04.41-.12.6a1.4 1.4 0 0 1-.33.51l-4.6 4.6c-.3.3-.67.45-1.1.45s-.8-.15-1.1-.45z" />
    </svg>
  );
}

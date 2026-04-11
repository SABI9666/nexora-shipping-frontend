interface NexoraLogoProps {
  className?: string;
  height?: number;
}

export function NexoraLogo({ className = '', height = 40 }: NexoraLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Nexora Shipping"
      height={height}
      style={{ height, width: 'auto' }}
      className={className}
    />
  );
}

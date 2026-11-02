import { MeshGradient } from '@paper-design/shaders-react';

// One static GPU render, not a permanent render loop. The parent only mounts this on opt-in.
export default function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <MeshGradient
        colors={['#101e32', '#244953', '#2a2b50', '#11223b']}
        speed={0}
        distortion={0.4}
        swirl={0.3}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

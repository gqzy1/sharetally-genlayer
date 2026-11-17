export interface ReleaseManifest {
  protocol: string;
  status: 'NOT_DEPLOYED' | 'DEPLOYED';
  chainId: number;
  rpc: string;
  sdk: string;
  address: `0x${string}` | null;
  sourceSha256: string;
  deployTransaction: string | null;
}

import manifest from '../../../deployment.json';
export const RELEASE_MANIFEST=manifest as ReleaseManifest;

export function isDeployedRelease(manifest: ReleaseManifest): boolean {
  return manifest.status === 'DEPLOYED' && manifest.chainId===61999 && manifest.rpc==='https://studio.genlayer.com/api' && manifest.sdk==='genlayer-js@1.1.8' && /^0x[0-9a-fA-F]{40}$/.test(manifest.address??'') && !/^0x0{40}$/i.test(manifest.address??'') && /^[a-f0-9]{64}$/.test(manifest.sourceSha256) && /^0x[a-fA-F0-9]{64}$/.test(manifest.deployTransaction??'');
}

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

export const RELEASE_MANIFEST: ReleaseManifest = {
  protocol: 'sharetally-1',
  status: 'NOT_DEPLOYED',
  chainId: 61999,
  rpc: 'https://studio.genlayer.com/api',
  sdk: 'genlayer-js@1.1.8',
  address: null,
  sourceSha256: '0cf60ea7b2dac5a6e25713e889965cf5b6acf22b3d4252932a4c44e779192aae',
  deployTransaction: null,
};

export function isDeployedRelease(manifest: ReleaseManifest): boolean {
  return manifest.status === 'DEPLOYED' && Boolean(manifest.address);
}

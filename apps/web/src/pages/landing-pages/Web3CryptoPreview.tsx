import { Web3Crypto } from '@/components/landing-pages/templates/Web3Crypto'
import { web3CryptoData } from '@/data/web3-crypto'

export function Web3CryptoPreview() {
  return (
    <div className="w-full">
      <Web3Crypto data={web3CryptoData} />
    </div>
  )
}

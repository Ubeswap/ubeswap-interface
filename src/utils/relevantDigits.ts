import { Fraction, TokenAmount } from '@ubeswap/sdk'

function substringDigit(input: string) {
  switch (input) {
    case '0':
      return '₀'
    case '1':
      return '₁'
    case '2':
      return '₂'
    case '3':
      return '₃'
    case '4':
      return '₄'
    case '5':
      return '₅'
    case '6':
      return '₆'
    case '7':
      return '₇'
    case '8':
      return '₈'
    case '9':
      return '₉'
    default:
      return ''
  }
}

export function relevantDigits(tokenAmount?: TokenAmount) {
  if (!tokenAmount || tokenAmount.equalTo('0')) {
    return '0.0'
  }

  if (tokenAmount.lessThan(new Fraction('1', '100'))) {
    const text = tokenAmount.toSignificant(1)
    return text.replace(/\.([0]{3,})/, function (m: string, g1: string) {
      const length = g1.length
      return '.0' + (length + '').replace(/\d/g, substringDigit)
    })
  }

  if (tokenAmount.lessThan('1')) {
    return tokenAmount.toSignificant(2)
  }

  if (tokenAmount.lessThan('100')) {
    return tokenAmount.toFixed(2)
  }

  return tokenAmount.toFixed(0, { groupSeparator: ',' })
}

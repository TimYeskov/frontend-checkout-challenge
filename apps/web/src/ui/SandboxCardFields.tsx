import type { SandboxCard } from '../api/resources';
import { cardChoices } from '../domain/payment';
import { ChoiceGroup } from './ChoiceGroup';

type Props = {
  cards: readonly SandboxCard[];
  value: string;
  onChange: (value: string) => void;
};

export function SandboxCardFields({ cards, value, onChange }: Props) {
  return (
    <ChoiceGroup
      name="card"
      legend="Тестовая карта"
      value={value}
      onChange={onChange}
      options={cardChoices(cards)}
    />
  );
}

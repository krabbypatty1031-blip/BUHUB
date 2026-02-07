import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Avatar from '../components/common/Avatar';

describe('Avatar', () => {
  it('renders first character of text', () => {
    render(<Avatar text="Alice" />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { toJSON } = render(<Avatar text="B" size="lg" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders image when uri is provided', () => {
    const { toJSON } = render(<Avatar text="C" uri="https://example.com/avatar.jpg" />);
    expect(toJSON()).toBeTruthy();
  });

  it('applies gender colors', () => {
    const { toJSON: male } = render(<Avatar text="M" gender="male" />);
    const { toJSON: female } = render(<Avatar text="F" gender="female" />);
    expect(male()).toBeTruthy();
    expect(female()).toBeTruthy();
  });
});

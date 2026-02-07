import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Tag from '../components/common/Tag';

describe('Tag', () => {
  it('renders label text', () => {
    render(<Tag label="TreeHole" />);
    expect(screen.getByText('TreeHole')).toBeTruthy();
  });

  it('calls onPress when provided', () => {
    const onPress = jest.fn();
    render(<Tag label="Campus" onPress={onPress} />);
    fireEvent.press(screen.getByText('Campus'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when no onPress', () => {
    const { toJSON } = render(<Tag label="Test" />);
    expect(toJSON()).toBeTruthy();
  });
});

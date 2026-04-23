import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// SF and DHL both render at 28px to match the other function-hub icons.
type IconProps = { size?: number };

const SF_SIZE = 28;
const DHL_SIZE = 28;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sfLogo = require('../../../assets/images/sf-logo.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dhlLogo = require('../../../assets/images/dhl-logo.png');

export function LockerSFSCFnIcon(_props: IconProps) {
  return (
    <View style={styles.row}>
      <Image source={sfLogo} style={styles.sfLogo} resizeMode="contain" />
      <Image source={dhlLogo} style={styles.dhlLogo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: SF_SIZE,
  },
  sfLogo: {
    width: SF_SIZE,
    height: SF_SIZE,
  },
  dhlLogo: {
    width: DHL_SIZE,
    height: DHL_SIZE,
  },
});

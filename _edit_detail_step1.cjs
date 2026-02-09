const fs = require('fs');
const f = 'src/screens/functions/ErrandDetailScreen.tsx';
let s = fs.readFileSync(f, 'utf8');
console.log('Original line count:', s.split('\n').length);

// a) Add useState
s = s.replace(
  "import React, { useCallback } from 'react';",
  "import React, { useCallback, useState } from 'react';"
);

// b) Add Modal
s = s.replace(
  "  SafeAreaView,\n  ScrollView,\n} from 'react-native';",
  "  SafeAreaView,\n  ScrollView,\n  Modal,\n} from 'react-native';"
);

// c) Add icons
s = s.replace(
  "  TruckIcon,\n} from '../../components/common/icons';",
  "  TruckIcon,\n  MoreHorizontalIcon,\n  ForwardIcon,\n  ImageIcon,\n  EditIcon,\n  BarChartIcon,\n  ChevronRightIcon,\n  CloseIcon,\n} from '../../components/common/icons';"
);

console.log('Imports updated');

fs.writeFileSync(f, s);
console.log('Step 1 saved');
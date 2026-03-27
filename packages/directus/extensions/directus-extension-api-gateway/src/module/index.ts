import { defineModule } from '@directus/extensions-sdk';
import ModuleComponent from './module.vue';

export default defineModule({
	id:   'api-gateway',
	name: 'API Gateway',
	icon: 'hub',
	routes: [
		{
			path: '',
			component: ModuleComponent,
		},
	],
});

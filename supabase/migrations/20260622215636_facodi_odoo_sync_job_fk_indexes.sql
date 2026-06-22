create index if not exists odoo_sync_jobs_instance_id_idx
	on facodi.odoo_sync_jobs (instance_id);

create index if not exists odoo_sync_jobs_odoo_record_id_idx
	on facodi.odoo_sync_jobs (odoo_record_id);
